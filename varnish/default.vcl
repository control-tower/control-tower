vcl 4.0;
import directors;
import std;

# Assumed 'wordpress' host, this can be docker servicename
backend default {
    .host = "develop";
    .port = "9000";
}

acl purge {
    "localhost";
	"127.0.0.1";
}


sub vcl_recv {
	# Only a single backend
    set req.backend_hint= default;

    # Setting http headers for backend
    set req.http.X-Forwarded-For = client.ip;
    set req.http.X-Forwarded-Proto = "http";

    # Unset headers that might cause us to cache duplicate infos
    unset req.http.Accept-Language;
    unset req.http.User-Agent;

	# The purge...no idea if this works
    if (req.method == "PURGE" && req.http.X-Purge-Regex) {
    ban("req.url ~ " + req.http.X-Purge-Regex);
        return(synth(200, req.http.X-Purge-Regex));
    }
    # drop tracking params
    if (req.url ~ "\?(utm_(campaign|medium|source|term)|adParams|client|cx|eid|fbid|feed|ref(id|src)?|v(er|iew))=") {
        set req.url = regsub(req.url, "\?.*$", "");
    }

    # pass wp-admin urls
    if (req.url ~ "(wp-login|wp-admin)" || req.url ~ "preview=true" || req.url ~ "xmlrpc.php") {
        return (pass);
    }

    # pass wp-admin cookies
    if (req.http.cookie) {
        if (req.http.cookie ~ "(wordpress_|wp-settings-)") {
            return(pass);
        } else {
            unset req.http.cookie;
        }
    }
 }



sub vcl_backend_response {
    # retry a few times if backend is down
    if ((beresp.status == 503 || beresp.status == 502) && bereq.retries < 3 ) {
       return(retry);
    }
    if ( beresp.status == 404 ) {
        set beresp.ttl = 0s;
        set beresp.uncacheable = true;
        return (deliver);
    }

    if (bereq.http.Cookie ~ "(UserID|_session)") {
	# if we get a session cookie...caching is a no-go
        set beresp.http.X-Cacheable = "NO:Got Session";
        set beresp.uncacheable = true;
        return (deliver);

    } elsif (beresp.ttl <= 0s) {
        # Varnish determined the object was not cacheable
        set beresp.http.X-Cacheable = "NO:Not Cacheable";

    } elsif (beresp.http.set-cookie) {
        # You don't wish to cache content for logged in users
        set beresp.http.X-Cacheable = "NO:Set-Cookie";
        set beresp.uncacheable = true;
        return (deliver);

    } elsif (beresp.http.Cache-Control ~ "private") {
        # You are respecting the Cache-Control=private header from the backend
        set beresp.http.X-Cacheable = "NO:Cache-Control=private";
        set beresp.uncacheable = true;
        return (deliver);

    } else {
        # Varnish determined the object was cacheable
        set beresp.http.X-Cacheable = "YES";

        # Remove Expires from backend, it's not long enough
  	unset beresp.http.expires;

        # Set the clients TTL on this object
        set beresp.http.cache-control = "max-age=900";

        # Set how long Varnish will keep it
        set beresp.ttl = 1w;

        # marker for vcl_deliver to reset Age:
        set beresp.http.magicmarker = "1";
    }

	# unset cookies from backendresponse
	if (!(bereq.url ~ "(wp-login|wp-admin)"))  {
		set beresp.http.X-UnsetCookies = "TRUE";
    		unset beresp.http.set-cookie;
    		set beresp.ttl = 1h;
	}

	# long ttl for assets
  	if (bereq.url ~ "\.(gif|jpg|jpeg|swf|ttf|css|js|flv|mp3|mp4|pdf|ico|png)(\?.*|)$") {
	    set beresp.ttl = 365d;

}
 set beresp.grace = 1w;

}

sub vcl_hash {
   if ( req.http.X-Forwarded-Proto ) {
    hash_data( req.http.X-Forwarded-Proto );
}
}

sub vcl_backend_error {
      # display custom error page if backend down
      if (beresp.status == 503 && bereq.retries == 3) {
          synthetic(std.fileread("/etc/varnish/error503.html"));
          return(deliver);
       }
 }

sub vcl_synth {
    # redirect for http
    if (resp.status == 750) {
        set resp.status = 301;
        set resp.http.Location = req.http.x-redir;
        return(deliver);
    }
# display custom error page if backend down
    if (resp.status == 503) {
        synthetic(std.fileread("/etc/varnish/error503.html"));
        return(deliver);
     }
}


sub vcl_deliver {
    # oh noes backend is down
    if (resp.status == 503) {
        return(restart);
    }
    if (resp.http.magicmarker) {
       # Remove the magic marker
        unset resp.http.magicmarker;

       # By definition we have a fresh object
       set resp.http.age = "0";
     }
   if (obj.hits > 0) {
     set resp.http.X-Cache = "HIT";
   } else {
     set resp.http.X-Cache = "MISS";
   }
   set resp.http.Access-Control-Allow-Origin = "*";
}
sub vcl_hit {
  if (req.method == "PURGE") {
    return(synth(200,"OK"));
  }
}

sub vcl_miss {
  if (req.method == "PURGE") {
    return(synth(404,"Not cached"));
  }
}

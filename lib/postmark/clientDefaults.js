var rev = require('git-rev-sync');
var sha = 'unknown revision';
var version = require('../../package.json').version;
try {
  sha = rev.long() || 'unknown revision';
} catch (e) {
  //unable to get the git rev. 
  //Probably because git is not installed in this environment.
}

module.exports = {
  requestHost: "api.postmarkapp.com",
  authorizationHeader: null,
  ssl: true,
  //define a function that can accept the options for a client
  requestFactory: function(options) {
    var client = require('http' + (options.ssl === true ? 's' : ''));

    return function(path, type, content, callback) {
      var msg = null;
      if (content) {
        msg = JSON.stringify(content);
      }

      var headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "postmark.js (Package-version: " + version + ";Revision:" + sha + ")"
      };

      headers[options.authorizationHeader] = options.apiKey;

      if (msg) {
        headers["Content-Length"] = Buffer.byteLength(msg);
      }

      var req = client.request({
        host: options.requestHost,
        path: path,
        method: type,
        headers: headers,
        port: (options.ssl ? 443 : 80)
      }, function(response) {

        var body = "";

        response.on("data", function(i) {
          body += i;
        });

        response.on("end", function() {
          if (response.statusCode == 200) {
            if (callback) {
              try {
                var ret = JSON.parse(body);
                callback(null, ret);
              } catch (e) {
                callback(e);
              }
            }
          } else {
            if (callback) {
              var data;
              try {
                data = JSON.parse(body);
                callback({
                  status: response.statusCode,
                  message: data['Message'],
                  code: data['ErrorCode']
                });
              } catch (e) {
                callback({
                  status: 404,
                  message: "Unsupported Request Method and Protocol",
                  code: -1 // this is a fake error code !
                });
              }

            }
          }
        });
      });

      req.on('error', function(err) {
        if (callback) {
          callback(err);
        }
      });

      if (msg) {
        req.write(msg);
      }
      req.end();
    }
  }
};
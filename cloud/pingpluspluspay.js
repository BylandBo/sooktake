var http = require('http');

var crypto = require("crypto"),
    fs  = require("fs");

var pub_key_path = __dirname + "/rsa_public_key.pem";

http.createServer(function (req, res) {

  req.setEncoding('utf8');
  var postData = "";
  req.addListener("data", function (chunk) {
    postData += chunk;
  });
  req.addListener("end", function () {
    var resp = function (ret, status_code) {
      res.writeHead(status_code, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      res.end(ret);
    }
    try {
      var event = JSON.parse(postData);
      if (event.type === undefined) {
        return resp('Event type undefined', 400);
      }
      switch (event.type) {
        case "charge.succeeded":
          // todo
          return resp("OK", 200);
          break;
        case "refund.succeeded":
          // todo
          return resp("OK", 200);
          break;
        default:
          return resp("Unknow Event type", 400);
          break;
      }
    } catch (err) {
      return resp('JSON analyz failed' 400);
    }
  });
}).listen(8000, "127.0.0.1");


// verify webhooks
var verify_signature = function(raw_data, signature, pub_key_path) {
  var verifier = crypto.createVerify('RSA-SHA256').update(raw_data, "utf8");
  var pub_key = fs.readFileSync(pub_key_path, "utf8");
  return verifier.verify(pub_key, signature, 'base64');
}
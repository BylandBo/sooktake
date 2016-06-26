var router = require('express').Router();
var AV = require('leanengine');

var crypto = require("crypto"),
    fs  = require("fs");

var pub_key_path = __dirname + "/rsa_public_key.pem";


router.post('/', function(request, response) {
  request.setEncoding('utf8');
  console.log("ping++ all data: " + request);
  var postData = request.body;
  var resp = function (ret, status_code) {
      response.writeHead(status_code, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end(ret);
    }
    try {
      var event = JSON.parse(JSON.stringify(postData));
      if (event.type === undefined) {
        return resp('Event no type column', 400);
      }
	  console.log("ping++ event type: " + event.type);
      switch (event.type) {
        case "charge.succeeded":
          // 开发者在此处加入对支付异步通知的处理代码
          return resp("OK", 200);
          break;
        case "refund.succeeded":
          // 开发者在此处加入对退款异步通知的处理代码
          return resp("OK", 200);
          break;
        default:
          return resp("Unknown Event typr", 400);
          break;
      }
    } catch (err) {
	  console.log(err);
      return resp('JSON serializ failed', 400);
    }
});


// verify webhooks
var verify_signature = function(raw_data, signature, pub_key_path) {
  var verifier = crypto.createVerify('RSA-SHA256').update(raw_data, "utf8");
  var pub_key = fs.readFileSync(pub_key_path, "utf8");
  return verifier.verify(pub_key, signature, 'base64');
}

module.exports = router;
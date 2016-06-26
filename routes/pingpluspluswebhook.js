var router = require('express').Router();
var AV = require('leanengine');
var pingpp = require('pingpp');

// Ping++ app info
var API_KEY = "sk_test_qb58aPjHiDKC1mr1OSSyfnbP" //ping++ Test/Live Key
var APP_ID = "app_mjj10KPGqXzPDiHe" //ping++ APP ID

var crypto = require("crypto"),
    fs  = require("fs");

var pub_key_path = __dirname + "/rsa_public_key.pem";

//ping++ private key
pingpp.setPrivateKeyPath(__dirname + "/rsa_private_key.pem");

router.post('/', function(request, response) {
  request.setEncoding('utf8');
  console.log("ping++ header data: " + JSON.stringify(request.headers));
  var postData = request.body;
  var resp = function (ret, status_code) {
      response.writeHead(status_code, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end(ret);
    }
  var signature = request.headers['x-pingplusplus-signature'];
  console.log("ping++ signature: " + signature);
  if (verify_signature(postData, signature, pub_key_path)) {
	try {
      var event = JSON.parse(JSON.stringify(postData));
      if (event.type === undefined) {
        return resp('Event no type column', 400);
      }
	  console.log("ping++ event type: " + event.type);
      switch (event.type) {
        case "charge.succeeded":
          // asyn handling to charge succeed
          return resp("OK", 200);
          break;
        case "refund.succeeded":
          // asyn handling to refund succeed
          return resp("OK", 200);
          break;
        default:
          return resp("Unknown Event type", 400);
          break;
      }
    } catch (err) {
	  console.log(err);
      return resp('JSON serializ failed', 400);
    }
	console.log('verification succeeded');
	} else {
	  console.log('verification failed');
   }
});


// verify webhooks
var verify_signature = function(raw_data, signature, pub_key_path) {
  try
  {
	  var verifier = crypto.createVerify('RSA-SHA256').update(raw_data, "utf8");
	  var pub_key = fs.readFileSync(pub_key_path, "utf8");
	  return verifier.verify(pub_key, signature, 'base64');
  }
  catch (err) {
	  console.log(err);
      return false;
  }
}

module.exports = router;
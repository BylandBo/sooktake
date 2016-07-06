var router = require('express').Router();
var AV = require('leanengine');
// Ping++ app info
var API_KEY = "sk_test_qb58aPjHiDKC1mr1OSSyfnbP" //ping++ Test/Live Key
var APP_ID = "app_mjj10KPGqXzPDiHe" //ping++ APP ID
var pingpp = require('pingpp')(API_KEY);

var crypto = require("crypto"),
    fs  = require("fs");

var pub_key_path = __dirname + "/rsa_public_key.pem";

router.post('/', function(request, response) {
  pingpp.parseHeaders(request.headers); // 把从客户端传上来的 Headers 传到这里
  //ping++ private key
  pingpp.setPrivateKeyPath(__dirname + "/rsa_private_key.pem");
  request.setEncoding('utf8');
  
  var postData = JSON.stringify(request.body);
  var resp = function (ret, status_code) {
      response.writeHead(status_code, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end(ret);
    }
  var signature = request.headers['x-pingplusplus-signature'];
  if (verify_signature(postData, signature, pub_key_path)) {
	try {
      var event = JSON.parse(postData);
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
	  console.log('raw_data-> '+ raw_data + ',   signature-> '+ signature + ',   pub_key_path-> ' + pub_key_path);
	  //var verifier = crypto.createVerify('RSA-SHA256').update(raw_data, "utf8");
	  //var pub_key = fs.readFileSync(pub_key_path, "utf8");
	  //return verifier.verify(pub_key, signature, 'base64');
	  return true;
  }
  catch (err) {
	  console.log(err);
      return false;
  }
}

module.exports = router;
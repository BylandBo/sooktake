var router = require('express').Router();
var AV = require('leanengine');

var crypto = require("crypto"),
    fs  = require("fs");

var pub_key_path = __dirname + "/rsa_public_key.pem";


router.post('/', function(request, response) {
  request.setEncoding('utf8');
  var postData = request.body;
  console.log(postData);
    try {
      var event = jQuery.parseJSON(JSON.stringify(postData));
      if (event.type === undefined) {
        return response('Event 对象中缺少 type 字段', 400);
      }
      switch (event.type) {
        case "charge.succeeded":
          // 开发者在此处加入对支付异步通知的处理代码
          return response("OK", 200);
          break;
        case "refund.succeeded":
          // 开发者在此处加入对退款异步通知的处理代码
          return response("OK", 200);
          break;
        default:
          return response("未知 Event 类型", 400);
          break;
      }
    } catch (err) {
	  console.log(err);
      return response('JSON 解析失败', 400);
    }
});


// verify webhooks
var verify_signature = function(raw_data, signature, pub_key_path) {
  var verifier = crypto.createVerify('RSA-SHA256').update(raw_data, "utf8");
  var pub_key = fs.readFileSync(pub_key_path, "utf8");
  return verifier.verify(pub_key, signature, 'base64');
}

module.exports = router;
var router = require('express').Router();
var AV = require('leanengine');

var crypto = require("crypto"),
    fs  = require("fs");

var pub_key_path = __dirname + "/rsa_public_key.pem";

// `AV.Object.extend` 方法一定要放在全局变量，否则会造成堆栈溢出。


router.post('/pingpluswebhooks', function(request, response) {
    console.log(request);
    try {
      var event = JSON.parse(request);
      if (event.type === undefined) {
        return response('Event type undefined', 400);
      }
      switch (event.type) {
        case "charge.succeeded":
          // todo
          return response("OK", 200);
          break;
        case "refund.succeeded":
          // todo
          return response("OK", 200);
          break;
        default:
          return response("Unknow Event type", 400);
          break;
      }
    } catch (err) {
      return response('JSON analyz failed', 400);
    }
});

module.exports = router;

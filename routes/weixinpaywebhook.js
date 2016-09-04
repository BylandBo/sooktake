var router = require('express').Router();
var util = require('/home/leanengine/app' + '/cloud/util');

router.post('/', function(request, response, body) {
  request.setEncoding('utf8');
  console.log("Weixinpay Webhook received");
  
  request.success = function(){ request.end(util.buildXML({ xml:{ return_code:'SUCCESS' } })); };
  request.fail = function(){ request.end(util.buildXML({ xml:{ return_code:'FAIL' } })); };

  util.pipe(request, function(err, data){
		var xml = data.toString('utf8');
		util.parseXML(xml, function(err, msg){
			request.wxmessage = msg;	
            console.log("Weixinpay Webhook received: " + JSON.stringify(msg));			
		});
  });
  AV.Cloud.run('WebCallFromWeiXin', { body: request }, {
							success: function (paymentResult) {},
							error: function (error) {}
  });
						  
  var msg = "<xml><return_code><SUCCESS></return_code><return_msg><OK></return_msg></xml>"
  response.success(msg);  
});


module.exports = router;
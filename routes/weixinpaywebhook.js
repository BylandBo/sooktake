var router = require('express').Router();
var util = require('/home/leanengine/app' + '/cloud/util');
var AV = require('leanengine');

router.post('/', function(request, response, body) {
  request.setEncoding('utf8');
  console.log("Weixinpay Webhook received");
  
  util.pipe(request, function(err, data){
		var xml = data.toString('utf8');
		util.parseXML(xml, function(err, msg){
			request.wxmessage = msg;	
            console.log("Weixinpay Webhook received: " + JSON.stringify(msg));
			AV.Cloud.run('QueryWXOrder', { outTradeNo:  msg.out_trade_no}, {
										success: function (result) {
										    response.success(util.buildXML({ xml:{ return_code:'SUCCESS' } }));  
										},
										error: function (error) {
											response.success(util.buildXML({ xml:{ return_code:'FAIL' } }));  
										}
		    });			
		});
  });
});


module.exports = router;
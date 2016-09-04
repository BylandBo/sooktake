var router = require('express').Router();

router.post('/', function(request, response, body) {
  request.setEncoding('utf8');
  console.log("Weixinpay Webhook received");
  console.log("Weixinpay Webhook: " + JSON.stringify(request)); 
  
  AV.Cloud.run('WebCallFromWeiXin', { body: request }, {
							success: function (paymentResult) {
								
							},
							error: function (error) {
								
							}
  });
						  
  var msg = "<xml><return_code><SUCCESS></return_code><return_msg><OK></return_msg></xml>"
  response.success(msg);  
});


module.exports = router;
//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var pushModule = require('./pushmessage');
var AV = require('leanengine');
var crypto = require('crypto');
var WXPay = require('weixin-pay');
var fs  = require("fs");

/*Weixinpay API*/
var MERCHANT_ID = "1355707002" //微信商户号
var APP_ID = "wx2897d2d3645a2cc1" //weixin pay APP ID
var API_KEY = "5dacd15d3208ef852ec6a763e6f656f1" //微信商户平台API密钥

var WebHookUrl = "https://soontake.avosapps.us/weixinpaywebhook";

var wxpay = WXPay({
    appid: APP_ID,
    mch_id: MERCHANT_ID,
    partner_key: API_KEY, //微信商户平台API密钥 
    pfx: fs.readFileSync('/home/leanengine/app/weixinpaykeys/apiclient_cert.p12'), //微信商户平台证书
});

//******Functions Definition******//
AV.Cloud.define("PaymentTopup", function (request, response) {
    var amount = request.params.amount;
	var channel = request.params.channel;
	var userId = request.params.userId;

	var order_no = crypto.createHash('md5')
        .update(new Date().getTime().toString())
        .digest('hex').substr(0, 16);
		
	var ip = request.meta.remoteAddress;
	
	var params = {amount:amount,channel:channel,userId:userId,order_no:order_no};
	console.log("Payment - Topup: charge creation: order_no->" + order_no + ", UserId->" + userId + ", ip->" + ip + ", channel->"+ channel + ", amount->" + (amount/100)); 
	var userQuery = new AV.Query(AV.User);
	AV.Cloud.useMasterKey();
	userQuery.equalTo("objectId", userId);
	userQuery.include("wechatInfo");
	userQuery.find().then(function (users) {
		if(users.length <= 0)
		{
			console.log("Payment - Topup: cannot find user " + userId );
		}
		else
		{			
			var user = users[0];
			console.log("Payment - Topup: charge creation starting, order_no->" + order_no );
			
			wxpay.createUnifiedOrder({
				body: 'Soontake 充值',
				out_trade_no: order_no,
				total_fee: 1,
				spbill_create_ip: ip,
				notify_url: WebHookUrl,
				trade_type: 'NATIVE',
				attach: messageModule.PF_SHIPPING_PAYMENT_TOPUP()
			}, function(err, charge){
				console.log(charge);
				if(err != null || charge.return_code != 'SUCCESS'){
			     console.log("Payment - Topup: charge creation error, order_no->" + order_no );
				 console.log(err);
				 response.error(err.message);
				}
				else
				{
				  CreatePayment(user,charge,params,messageModule.PF_SHIPPING_PAYMENT_TOPUP(),response);
				}
			});
		}
	});
});

var CreatePayment = function (user, wxObj,params,type, response) {
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var myPayment = new Payment();
	
	myPayment.set("paymentChannel", params.channel);
	myPayment.set("total", (params.amount/100));
	myPayment.set("status", messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING());
	myPayment.set("type", type);
	myPayment.set("user",user);
	myPayment.set("transactionNumber",wxObj.prepay_id);
	myPayment.set("orderNo",params.order_no);
	myPayment.save(null, {
	  success: function(payment) {
	    console.log("Payment - " + type + ": payment creation succeed: transactionNumber->" + wxObj.prepay_id + ", UserId->" + user.id + ", order_no->" + params.order_no); 
		//add payment history to user
		var paymentRelation = user.relation('paymentHistory');
		paymentRelation.add(payment);
		user.save();
		
		response.success(wxObj);
	  },
	  error: function(message, error) {
		console.log(error.message);
		response.error(messageModule.errorMsg());
	  }
	});
};
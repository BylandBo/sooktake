//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var pushModule = require('./pushmessage');
var util = require('./util');
var AV = require('leanengine');
var crypto = require('crypto');
var md5 = require('MD5');
var WXPay = require('weixin-pay');
var fs  = require("fs");

/*Weixinpay API*/
var MERCHANT_ID = "1355707002" //微信商户号
var APP_ID = "wx2897d2d3645a2cc1" //weixin pay APP ID
var SECRET_KEY = "5dacd15d3208ef852ec6a763e6f656f1" //微信商户平台API密钥
var pfx = fs.readFileSync('/home/leanengine/app/weixinpaykeys/apiclient_cert.p12') //微信商户平台证书
var wxpayID = { appid:APP_ID, mch_id:MERCHANT_ID };

var wxpay = WXPay({
    appid: APP_ID,
    mch_id: MERCHANT_ID,
    partner_key: '5dacd15d3208ef852ec6a763e6f656f1', //微信商户平台API密钥 
    pfx: fs.readFileSync('/home/leanengine/app/weixinpaykeys/apiclient_cert.p12'), //微信商户平台证书
});

var sign = function(param){
	var querystring = Object.keys(param).filter(function(key){
		return param[key] !== undefined && param[key] !== '' && ['pfx', 'partner_key', 'sign', 'key'].indexOf(key)<0;
	}).sort().map(function(key){
		return key + '=' + param[key];
	}).join("&") + "&key=" + this.options.partner_key;

	console.log("queryString: " + querystring);
	
	return md5(querystring).toUpperCase();
};

//******Functions Definition******//
AV.Cloud.define("PaymentTopup", function (request, response) {
    var amount = request.params.amount;
	var channel = request.params.channel;
	var userId = request.params.userId;

	var order_no = crypto.createHash('md5')
        .update(new Date().getTime().toString())
        .digest('hex').substr(0, 16);
		
	var ip = request.meta.remoteAddress;
	
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
			
			var opts = {
				body: 'Soontake 充值' ,
				out_trade_no: order_no ,
				total_fee: 1 ,
				spbill_create_ip: ip ,
				trade_type: 'NATIVE',
				device_info: 'WEB',
				notify_url: 'https://soontake.avosapps.us/weixinpaywebhook'
			};
			opts.nonce_str = util.generateNonceString();
			util.mix(opts, wxpayID);
			console.log("opts: " + JSON.stringify(opts));
			
			sign(opts);
			
			
			wxpay.createUnifiedOrder({
				body: 'Soontake 充值',
				out_trade_no: order_no,
				total_fee: 1,
				spbill_create_ip: ip,
				notify_url: 'https://soontake.avosapps.us/weixinpaywebhook',
				trade_type: 'NATIVE',
				device_info: 'WEB'
			}, function(err, charge){
				console.log(charge);
				if(err != null){
			     console.log("Payment - Topup: charge creation error, order_no->" + order_no );
				 console.log(err);
				 response.error(err.message);
				}
				else
				{
				 //CreatePayment(user,charge,messageModule.PF_SHIPPING_PAYMENT_TOPUP(),response);
				}
			});
		}
	});
});
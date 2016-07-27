//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var pushModule = require('./pushmessage');
var AV = require('leanengine');
var crypto = require('crypto');
var WXPay = require('weixin-pay');
var fs  = require("fs");
var xml2js = require('xml2js');

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
				total_fee: amount,
				spbill_create_ip: ip,
				notify_url: WebHookUrl,
				trade_type: 'APP',
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

AV.Cloud.define("QueryWXOrder", function (request, response) {
    var out_trade_no = request.params.outTradeNo;
	
	console.log("Payment - QueryWXOrder: out_trade_no->" + out_trade_no);
	wxpay.queryOrder({ out_trade_no:out_trade_no }, function(err, order){
		console.log("Payment - QueryWXOrder result:"+ JSON.stringify(order));
		parseXML(order, function(err, msg){
				if(err != null)
				 console.log(err);
				var orderJson = msg;				
				console.log("Payment - QueryWXOrder json result:"+ JSON.stringify(orderJson));
				paymentCallback(orderJson);
				response.success(orderJson);
			});
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
	    console.log("Payment - " + type + ": payment creation succeed: transactionNumber->" + wxObj.prepay_id + ", UserId->" + user.id + ", order_no->" + params.order_no + ", amount->"+(params.amount/100)); 
		//add payment history to user
		var paymentRelation = user.relation('paymentHistory');
		paymentRelation.add(payment);
		user.save();
		
		var obj = newAPPReturnObj(wxObj,params.order_no);
		response.success(obj);
	  },
	  error: function(message, error) {
		console.log(error.message);
		response.error(messageModule.errorMsg());
	  }
	});
};

var newAPPReturnObj = function (wxObj,out_trade_no){
	var newObj = {
		appid: APP_ID,
		noncestr: wxObj.nonce_str,
		package: 'Sign=WXPay',
		partnerid: MERCHANT_ID,
		prepayid: wxObj.prepay_id,
		timestamp: parseInt(Date.now()/1000),
		sign: '',
		outTradeNo: ''
	};
	var newSign = wxpay.sign(newObj);
	newObj.sign = newSign;
	newObj.outTradeNo = out_trade_no;
	console.log("Return to APP: " + JSON.stringify(newObj));
	return newObj;
}

var topupCallback = function(payment,data){
	payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
	payment.set("transactionId",data.transaction_id);
	payment.save().then(function(result){
	    var user = payment.get("user");
	    var balance = user.get("totalMoney") + data.total_fee;
		user.set("totalMoney",balance);
		user.save().then(function(result){
			console.log("paymentCallback: Payment - Topup success for user->" + user.id + " with transactionId-> " + data.transaction_id + " with amount->" + data.total_fee);
			pushModule.PushPaymentTopupSucceedToUser(payment,data.total_fee,user);
		},function (error) {
			console.log(error.message);
		});
	},function (error) {
		console.log(error.message);
	});
}

var paymentCallback = function(order){
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var paymentQuery = new AV.Query(Payment);
	
	paymentQuery.equalTo("orderNo", order.out_trade_no);
	paymentQuery.include("user");
	paymentQuery.find({
        success: function (payments) {
		     if(payments.length <= 0)
			 {
				console.log("paymentCallback: Unknown payment with out_trade_no: " + order.out_trade_no);
			 }
			 else
			 {
				 var payment = payments[0];
				 switch (order.attach) {
					case messageModule.PF_SHIPPING_PAYMENT_TOPUP():
						topupCallback(payment,order);
					  break;
					default:
					  return resp(returnFAILxml('Unknown Event type'), 400);
					  break;
				  }
			 }
        },
        error: function (error) {
            console.log(error.message);
        }
    });
}
parseXML = function(xml, fn){
	var parser = new xml2js.Parser({ trim:true, explicitArray:false, explicitRoot:false });
	parser.parseString(xml, fn||function(err, result){
		return result;
	});
};
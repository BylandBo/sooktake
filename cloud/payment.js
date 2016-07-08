//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var messageModule = require('./message');
var pushModule = require('./pushmessage');
var AV = require('leanengine');
var crypto = require('crypto');

/*Ping++ API*/
var API_KEY = "sk_test_qb58aPjHiDKC1mr1OSSyfnbP" //ping++ Test/Live Key
var APP_ID = "app_mjj10KPGqXzPDiHe" //ping++ APP ID
var pingpp = require('pingpp')(API_KEY);
var pub_key_path = __dirname + "/rsa_public_key.pem";
//******Functions Definition******//


/*payment function*/

AV.Cloud.define("PaymentTopup", function (request, response) {
    var UserDetails = AV.Object.extend(classnameModule.GetUserDetailsClass());
    var userDetailsQuery = new AV.Query(UserDetails);
	
    var amount = request.params.amount;
	var channel = request.params.channel;

	var order_no = crypto.createHash('md5')
				  .update(new Date().getTime().toString())
				  .digest('hex').substr(0, 16);
	pingpp.charges.create({
	  order_no:  order_no,
	  app:       { id: APP_ID },
	  channel:   channel,
	  amount:    100,
	  client_ip: "127.0.0.1",
	  currency:  "cny",
	  subject:   "Your Subject",
	  body:      "Your Body",
	  extra:     extra
	}, function(err, charge) {
	  // YOUR CODE
	  console.log(err);
	  console.log(charge);
	});

	console.log("GetShuikeRegistrationList-> status:" + status);
    userDetailsQuery.include("owner");
    userDetailsQuery.equalTo("status", status);
	
    userDetailsQuery.find().then(function(results){
			   response.success(results);
			},function (error) {
				console.log(error.message);
				response.error(messageModule.errorMsg());
			});
});
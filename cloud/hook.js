//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var AV = require('leanengine');

AV.Cloud.afterSave(classnameModule.GetShippingClass(), function(request) {
  var Cargo = AV.Object.extend(classnameModule.GetCargoClass());
  var cargoQuery = new AV.Query(Cargo);
  
  var Flight = AV.Object.extend(classnameModule.GetFlightClass());
  var flightQuery = new AV.Query(Flight);
	
  console.log("Hook function: shipping after save update Cargo: " + request.object.get('cargo').id);
  
  cargoQuery.include("owner");
  cargoQuery.get(request.object.get('cargo').id, {
    success: function(cargo) {
	  console.log("Hook function: update shipping to Cargo: " + request.object.id)
      cargo.set("shipping",request.object);
      cargo.save();
	  
	  console.log("Hook function: update shipping to CargoUser: " + request.object.id)
	  var cargoOwner = cargo.get("owner");
	  var cargoRelation = cargoOwner.relation('existShippings');
	  cargoRelation.add(request.object);
	  if(request.object.get("status") == messageModule.ShippingStatus_Received())
	  {
	   var oldScores = cargoOwner.get("scores");
	   cargoOwner.set("scores",oldScores+10);
	  }
	  cargoOwner.save();
    },
    error: function(error) {
	   console.log('Got an error ' + error.code + ' : ' + error.message);
    }
  });
  
  flightQuery.include("owner");
  flightQuery.get(request.object.get('flight').id, {
    success: function(flight) {
	  console.log("Hook function: update shipping to Flight: " + request.object.id)
      flight.addUnique("shippingList",request.object);
      flight.save();
	  
	  console.log("Hook function: update shipping to flightUser: " + request.object.id)
	  var flightOwner = flight.get("owner");
	  var flightRelation = flightOwner.relation('existShippings');
	  flightRelation.add(request.object);
	  if(request.object.get("status") == messageModule.ShippingStatus_Received())
	  {
	   var oldScores2 = flightOwner.get("scores");
	   flightOwner.set("scores",oldScores2+10);
	  }
	  flightOwner.save();
    },
    error: function(error) {
	   console.log('Got an error ' + error.code + ' : ' + error.message);
    }
  });
});


AV.Cloud.afterSave(classnameModule.GetPushMessageClass(), function(request) {
		var userToQuery = new AV.Query(AV.User); 
		console.log("Send to User Id: " + request.object.get("sendTo").id);
		userToQuery.equalTo("objectId", request.object.get("sendTo").id);
		if( request.object.get("type") != "system")
		{
			AV.Cloud.useMasterKey();
				userToQuery.find().then(function (userTo) {
					if(userTo.length <= 0)
						console.log(messageModule.UserNotFound());
					else
					{
						console.log("Hook function: update message "+request.object.id+" to User: " + userTo[0].id);
						var messageToRelation = userTo[0].relation('existMessages');
						messageToRelation.add(request.object);
						userTo[0].save();
					}
				},function (error) {
						console.log(error.message);
				});
	    }
});

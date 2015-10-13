"use strict";

function FirebaseApi(url){
	var _url = url;

	var download = function(url){

	  return new Promise(function(resolve, reject) {
	    var req = new XMLHttpRequest();
	    req.open('GET', url);
	    req.onload = function() {
	      if (req.status == 200) {
	        resolve(JSON.parse(req.response));
	      }
	      else {
	        reject(Error(req.statusText));
	      }
	    };
	    req.onerror = function() {
	      reject(Error("Network Error"));
	    };
	    req.send();
	  });

	};

	var downloadAll = function(urls){
		return Promise.all(urls.map(download));
	};

	var Get = function(keys){
		var urls=keys.map(function(key){
			return _url + "/" + key + ".json";
		});

		return downloadAll(urls);
	};

	var Search = function(term){
		var url = _url + ".json?orderBy=\"$key\"&limitToFirst=5&startAt=\"" + term + "\"";

		var json = download(url).then(function(val){
			var results = [];
			Object.keys(val).forEach(function(key){
				results.push(val[key]);
			})

			return results;

		});

		return json;
	};

	return {Get:Get,Search:Search};
}

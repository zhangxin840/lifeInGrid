//Author: Zhang Xin
//Mail: zhangxin840@gmail.com
//
//Inspired by monitter.com
//Tanks to Tim Koschützki for his post about how to write jQuery plugins: http://debuggable.com/posts/how-to-write-jquery-plugins:4f72ab2e-7310-4a74-817a-0a04cbdd56cb//Functional module pattern is explained in the great book "Javascript: The Good Parts"
//
//You may need a localhost to run the demo, becuse twitter web service used a JSONP approach for cross domain request
//

// Wrapping the jQuery object into the dollar sign via a closure avoids conflicts with other libraries that also use the dollar sign as an abbreviation
// The semi-colon before the function invocation keeps the plugin from breaking if our plugin is concatenated with other scripts that are not closed properly
// "use strict"; puts our code into strict mode
;(function($) {"use strict";
	var name = 'jqListener';
	
	var jqListener = function(element, options) {
		var container = $(element);

		var defaults = {
			keyword : "apple",
			language : "en",
			maxNum : 6, //Max number of tweets the container can hold
			firstNum : 3, //Number of tweets of the first request
			animation : true,
			animationSpeed : 2000,
			fetchInterval : 2000
		};

		var timeoutVal = 3000;
		
		//Get options saved within container's data attributes
		var meta = container.data(name + '-options');

		var options = $.extend(defaults, meta, options);

		var status = {
			rrp : options.firstNum, //Number of tweets for a request
			isFirstFetch : true,
			lastId : 0
		};

		//Convert twitter plain text to link
		var parseLink = function(tweetText) {
			//Content link
			var result = tweetText.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/g, function(m) {
				return m.link(m);
			});

			//Topic link
			var result2 = result.replace(/[#]+[A-Za-z0-9-_]+/g, function(t) {
				var tag = t.replace("#", "%23");
				return t.link("http://search.twitter.com/search?q=" + tag);
			});

			//User link
			var result3 = result2.replace(/[@]+[A-Za-z0-9-_]+/g, function(u) {
				var username = u.replace("@", "");
				return u.link("http://twitter.com/" + username);
			});

			return result3;
		};

		var fetchTweets = function() {
			var elem = container;
			var keyword = options.keyword.replace("#", "%23");
			var lang = options.language;

			//Store in global object
			if (status.isFirstFetch) {
				status.isFirstFetch = false;
				status.lastId = 0;
			}

			//Search Url
			//If the Url includes the string "callback=?", the request is treated by jQuery as JSONP instead
			//JSONP request will add an extra "callback=?(random by jQuery, such as jsonp122345)" to the end of your URL to specify the callback. Disables caching by appending a query string parameter, "_=[TIMESTAMP]", to the URL unless the cache option is set to true
			//JSONP result is treated just like JSON
			//Twitter search API have a JSONP format respones if the request have a callback parameter
			var url = "http://search.twitter.com/search.json?q=" + keyword + "&lang=" + lang + "&rpp=" + status.rrp + "&since_id=" + status.lastId;

			//Twitter tweets API only have JSON format so it can't make cross domain request
			//var url = "https://api.twitter.com/1/statuses/show.json?id=112652479837110273&include_entities=true";

			//Must set timeout to enable error handling for JSONP request(jQuery 1.5+)
			$.ajax({
				url : url,
				dataType : 'jsonp',
				timeout : timeoutVal,
				success : function(json) {
					$(json.results).reverse().each(function() {
						if ($('#tw' + this.id, elem).length === 0) {

							var thedate = new Date(Date.parse(this.created_at));
							var thedatestr = thedate.getHours() + ':' + thedate.getMinutes();

							//Creat tweet div
							var divstr = '<div id="tw' + this.id + '" class="tweet"><img width="48" height="48" src="' + this.profile_image_url + '" ><p class="text">' + parseLink(this.text) + '<br />&nbsp;<b><a href="http://twitter.com/' + this.from_user + '" target="_blank">' + this.from_user + '</a></b> &nbsp;-&nbsp;<b>' + thedatestr + '</b></p></div>';

							//Update since id
							status.lastId = this.id;

							//Remove old twitte div
							var elemChildLength = elem.find("div").length;
							if (elemChildLength === that.options.maxNum) {
								elem.find("div:last").remove();
							}

							elem.prepend(divstr);

							if (options.animation === true) {
								$('#tw' + this.id, elem).hide();
								$('#tw' + this.id + ' img', elem).hide();
								$('#tw' + this.id + ' img', elem).fadeIn(options.animationSpeed);
								$('#tw' + this.id, elem).fadeIn(options.animationSpeed);
							}
						}
					});

					//Get one tweet after first fetch
					status.rrp = 1;

					setTimeout(function() {
						fetchTweets();
					}, options.fetchInterval);
				},
				error : function(jqXHR, textStatus, errorThrown){
					console.log("jqLietener: " + textStatus);
										
					setTimeout(function() {
						fetchTweets();
					}, options.fetchInterval);
				}
			});
		};

		var init = function() {
			startListening();
			//Delegation mode
			//Name as event namespace, which allows easy unbinding later without removing event listeners on the widget elements that were not bound using our plugin.
			container.on('click.' + name, 'h1', function(e) {
				e.preventDefault();
				handler();
			});
		};

		var handler = function() {
		};

		var startListening = function() {
			fetchTweets();
		};

		var changeListening = function(keyword) {
			container.children().remove();
			options.keyword = keyword;
			status.rrp = defaults.firstNum;
		};

		//Destroy the warp object without removing elements
		var destroy = function() {
			//Unbind events
			container.off('.' + name);
			container.find('*').off('.' + name);
			//Remove data
			container.removeData(name);
			container = null;
		};

		//Wapper object
		var that = {};
		that.options = options;
		that.destroy = destroy;
		that.startListening = startListening;
		that.changeListening = changeListening;

		//Initialize the wrapper object to generate elements of the widget
		init();

		//
		//
		//
		//Store wrapper object in container using jQuery's $.data function.
		//Usage: console.log($('#theListener').data('jqListener'));
		container.data(name, that);
	};

	//
	//jQuery function
	//
	$.fn.reverse = Array.prototype.reverse;

	$.fn.jqListener = function(options) {
		//Create a wrapper object for each matched container
		this.each(function() {
			jqListener(this, options);
		});
		//Chain-ability of jQuery objects
		return this;
	};

	$.fn.changeListening = function(keyword) {
		this.each(function() {
			//Get wrapper object from data
			var jqListener = $(this).data("jqListener");
			if (jqListener) {
				jqListener.changeListening(keyword);
			} else {
				throw "Element not a valid container";
			}
		});
		//Chain-ability of jQuery objects
		return this;
	};

})(jQuery);


$(function() {
	var samplesFormat = Tone.Buffer.supportsType("mp3") ? "mp3" : "ogg";
	var trackData = JSON.parse(data);
	var numberOfTracks = 4;
	var samplerIDs = ["A", "B", "C", "D", "E", "F"];

	var Track = {};
	Track.buffers = [];
	Track.number = 1;
	Track.sumOfBuffersPlayedTimes = 0;
	Track.data = {};
	Track.sampler = {};
	Track.samples = {};

	function Buffer(id, overlayID) {
		this.size = 0;
		this.position = 0;
		this.id = id;
		this.overlayID = overlayID;
		this.content = $(this.id).text();
		this.map = {};
		this.allMatchedIndexes = [];
		this.currentParagraphIndex = 0;
		this.previousParagraphLength = 0;
		this.lastParagraphNumber = 0;
		this.samplerID = "";
		this.playedTimes = 0;
	}

	Buffer.colors = ["#F800B4", "#3CDE00", "#B5F300", "#F20026", "#000000"];
	Buffer.bgfg = ["color", "background-color"];

	////////////////////////////////////////////////////////
	// Shows cursor incrementation and matchings for buffer
	////////////////////////////////////////////////////////

	Buffer.prototype.highlightText = function () {
		var output = "",
		self = this;

		this.position %= this.size;

		// ______________________________________________
		// highlight symbol under current cursor position
		var $thisParagraph = $(self.id + " p:eq("+self.currentParagraphIndex+")");
		var paragraphLength = $thisParagraph.text().length;
		var paragraphCursorPosition = self.position-self.previousParagraphLength;

		if (self.position === 0 && self.lastParagraphNumber !== 0) {
			// remove highlighting tag of last symbol in the buffer, when
			// the cursor returns to the start
			var $lastPar = $(self.id + " p:eq("+self.lastParagraphNumber+")");
			var lastParText = $lastPar.text();
			var newOutput = "<p>" + lastParText + "</p>";
			$lastPar.replaceWith(newOutput);
		}

		if (paragraphCursorPosition === paragraphLength || paragraphLength === 0) {
			self.previousParagraphLength += $(self.id + " p:eq("+self.currentParagraphIndex+")").text().length;
			self.currentParagraphIndex++;
		}

		if (self.position === (self.size-1)) {
			self.lastParagraphNumber = self.currentParagraphIndex;
			self.currentParagraphIndex = 0;
			self.previousParagraphLength = 0;
		}

		var text = $thisParagraph.text();

		output = "<p>" + text.substr(0, paragraphCursorPosition) +
		"<span class=\"playing-symbol\">" +
		text.substr(paragraphCursorPosition, 1) +
		"</span>" +
		text.substr(paragraphCursorPosition+1) + "</p>";

		$thisParagraph.replaceWith(output);

		// ___________________
		// highlight matchings

		if (self.allMatchedIndexes.indexOf(self.position) < 0) {
			// hidding highlight view
			if ($(self.overlayID).css("opacity") == 1) {
				$(self.overlayID).fadeTo(2000, 0);
				$(self.id).fadeTo(2000, 1);
			}

		} else {
			var highlightStr = self.map[self.position];

			// playing sample

			var sampleToPlay = self.samplerID + "." + Track.data.matchings[highlightStr];
			if (Track.data.matchings[highlightStr] !== undefined) {
				Track.sampler.start(sampleToPlay);
			}

			// showing highlight

			// changing text in the highlight view
			$(self.overlayID+" span").html(highlightStr);
			self.position+=(highlightStr.length-1);

			// changing font size in the highlight view
			var newFontSize = highlightStr.length == 1 ? 8 : 9/Math.pow(2, Math.log(highlightStr.length));
			$(self.overlayID).css("font-size", newFontSize+"vw");

			if ($(self.overlayID).css("opacity") <= 1) {

				// Color changing
				var newColorIndex = Math.floor(Math.random()*Buffer.colors.length);
				var newBgfgIndex = Math.floor(Math.random()*2);

				var cssObj = {};
				cssObj[Buffer.bgfg[newBgfgIndex]] = Buffer.colors[newColorIndex];
				cssObj[Buffer.bgfg[1-newBgfgIndex]] = "#ffffff";

				$(self.overlayID).css(cssObj);

				// showing highlight
				$(self.overlayID).stop().fadeTo(100, 1);

				// hidding text buffer
				$(self.id).stop().fadeTo(100, 0);
			}
		}
	};

	//////////////////////////////////////////////////////////////
	// Updates matchings in text using new expression as argument
	//////////////////////////////////////////////////////////////

	Buffer.prototype.updateMatchings = function() {
		var self = this;
		this.map = {};
		this.allMatchedIndexes = [];

		var match;
		while ((match = Buffer.expression.exec(self.content)) !== null) {
			self.map[match.index] = match[0];
			self.allMatchedIndexes.push(match.index);
		}
	};

	/////////////////////////////////////////////////////////////////
	// Downloads new text from wikipedia and reloads buffer content
	/////////////////////////////////////////////////////////////////

	Buffer.prototype.update = function() {
		var self = this;
		var buffNum = parseInt(this.id.slice(-1)) - 1;

		// here showing loading indicator
		$("#load-indic-buf-"+(buffNum+1)).show();
		$("#load-indic-div-"+(buffNum+1)).css("z-index", 150);

		$.ajaxSetup({
			scriptCharset: "utf-8", //or "ISO-8859-1"
			contentType: "application/json; charset=utf-8"
		});

		$.getJSON('http://whateverorigin.org/get?url=' +
		encodeURIComponent('https://en.wikipedia.org/wiki/Special:Random') + '&callback=?',
		function (data) {
			// data editing
			var str = "";
			// remove all the imgs from data to prevent 404 on using the data
			// with jquery
			var htmlStr = data.contents.replace(/<\/?img.*>/gm, '');
			$(htmlStr).find("#mw-content-text p").each(function() {
				str += "<p>"+$(this).text()+"</p>";
			});

			// check if new text length is not less than 100 characters
			if (str.length < 100) {
				self.update();
				return;
			}

			// loading text into buffer
			$(self.id).html(str).promise().done(function() {

				self.size = $(self.id).text().length;
				self.position = 0;
				self.currentParagraphIndex = 0;
				self.previousParagraphLength = 0;
				self.lastParagraphNumber = 0;

				self.content = $(self.id).text();

				// here hidding loading indicator
				$("#load-indic-buf-"+(buffNum+1)).hide();
				$("#load-indic-div-"+(buffNum+1)).css("z-index", -150);

				self.updateMatchings();
			});
		});
	};

	////////////////////////////////////////////
	/*--------------Sound engine--------------*/
	////////////////////////////////////////////

	// Scheduler
	Tone.Transport.scheduleRepeat(function() {
		Track.buffers.forEach(function(buf) {
			if (buf.size > 0) {
				buf.highlightText();
				buf.position++;

				if (buf.position === buf.size) {
					buf.playedTimes++;
					Track.sumOfBuffersPlayedTimes += buf.playedTimes;

					// если все 6 буферов проиграли хотя бы по разу, то их общее
					// число проигрываний будет больше или равно 6.
					// Если общее число проигрываний больше или равно 6 – играть
					// следуюший трек.
					if (Track.sumOfBuffersPlayedTimes >= 6) {
						//play next track
						Track.didFinishedPlaying();
					}
				}
			}
		});
	}, "1m", "0");

	// Transport
	Track.play = function() {
		Tone.Transport.start();
		if (Tone.context.state === "suspended") {
			Tone.context.resume();
		}
	};

	Track.pause = function() {
		Tone.Transport.pause();
	};

	Track.rewind = function() {
		Tone.Transport.position = "0:0:0";
		Track.buffers.forEach(function(buf) {
			buf.position = 0;
			buf.currentParagraphIndex = 0;
			buf.previousParagraphLength = 0;
			buf.lastParagraphNumber = 0;
			buf.highlightText();
		});
	};

	Track.didFinishedPlaying = function() {
		Track.sumOfBuffersPlayedTimes = 0;

		Track.number = Track.number > (numberOfTracks-1) ? 1 : ++Track.number ;
		var strTrNum = ""+Track.number;

		Track.didChangeTo(strTrNum, Track.play);

		// view
		$("#tracklist").children("li").removeClass("current-track");
		$("#tracklist li:nth-child("+strTrNum+")").addClass("current-track");
	};

	Track.didChangeTo = function(track, buffersLoadingCallback) {
		// Update buffers
		Track.buffers.forEach(function(buf) {
			buf.update();
			buf.playedTimes = 0;
		});

		// Update expression
		var expr = trackData[track-1].expression;
		$("#expression-input").val(expr);
		expressionDidUpdateWith(expr);

		// Update tempo
		Tone.Transport.bpm.value = trackData[track-1].tempo;

		Track.data = trackData[track-1];

		// Reset playing state
		Track.pause();
		Track.rewind();

		// hide transport buttons and show buffers loading indicator
		$("#play-button").hide();
		$("#pause-button").hide();
		$("#rewind-button").hide();
		$("#loading-buffers-indicator").show();

		switch (track) {
			// !!!
			// нужно в callback() каждого Tone.Buffers добавлять
			// buffersLoadingCallback()
			// !!!
			case "1":
			Track.samples = new Tone.Buffers(Track.data.samplemap, function() {
				$("#play-button").show();
				$("#rewind-button").show();
				$("#loading-buffers-indicator").hide();
				buffersLoadingCallback();
			});
			Track.sampler = new Tone.MultiPlayer(Track.samples).toMaster();

			Track.number  = 1;
			break;

			case "2":
			// Track.samples = new Tone.Buffers(Track.data.samplemap, function() {
			// 	$("#play-button").show();
			// 	$("#rewind-button").show();
			// 	$("#loading-buffers-indicator").hide();
			// 	buffersLoadingCallback();
			// });
			// Track.sampler = new Tone.MultiPlayer(Track.samples).toMaster();

			Track.number  = 2;
			break;

			case "3":
			Track.number  = 3;
			break;

			case "4":
			Track.number  = 4;
			break;

			default: break;
		}

		// console.log(trackData[track-1]);
	};

	//////////////////////////////////////
	/*----------------UI----------------*/
	//////////////////////////////////////

	// Transport buttons
	$("#play-button").click(function() {
		Track.play();
		$(this).toggle();
		$("#pause-button").toggle();
	});

	$("#pause-button").click(function() {
		Track.pause();
		$(this).toggle();
		$("#play-button").toggle();
	});

	$("#rewind-button").mousedown(function() {
		Track.rewind();
		$(this).toggle();
		$("#rewind-button-mousedown").toggle();
	});

	$("#rewind-button-mousedown").mouseup(function() {
		$(this).toggle();
		$("#rewind-button").toggle();
	});

	// Expression
	function expressionDidUpdateWith(expr) {
		if (expr !== "") {
			try {
				Buffer.expression = new RegExp(expr, "gm");
			} catch (e) {
				alert(e);
				$("#expression-input").val(Buffer.expression.source);
			}
		} else {
			alert("This field cannot be empty.");
			$("#expression-input").val(Buffer.expression.source);
		}

		Track.buffers.forEach(function(buf) {
			buf.updateMatchings();
		});
	}

	$("#expression-input").on("keydown",function search(e) {
		if(e.keyCode == 13) {
			expressionDidUpdateWith($(this).val());
		}
	});

	$("#expression-input").focusout(function() {
		expressionDidUpdateWith($(this).val());
	});

	expressionDidUpdateWith($("#expression-input").val());

	// Tracklist
	$("#tracklist").children("li").click(function() {
		$("#tracklist").children("li").removeClass("current-track");
		$(this).addClass("current-track");

		Track.didChangeTo($(this).text(), function(){});
	});

	//-----------------
	// INITIALIZATIONS
	//-----------------

	// buffers
	for (var i = 0; i < 6; i++) {
		var newID = "#buffer-"+(i+1);
		var newOverlayID = "#buffer-overlay-"+(i+1);
		Track.buffers[i] = new Buffer(newID, newOverlayID);
		Track.buffers[i].size = $(Track.buffers[i].id).text().length;
		Track.buffers[i].samplerID = samplerIDs[i];
		Track.buffers[i].update();
	}

	// set track to first
	Track.didChangeTo("1", function(){});
});

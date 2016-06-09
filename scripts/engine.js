$(function() {

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
			$(data.contents).find("#mw-content-text p").each(function() {
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
				self.currentParagraphIndex = 0;
				self.previousParagraphLength = 0;
				self.lastParagraphNumber = 0;
				if (self.position > self.size) {
					self.position = 0;
				}

				self.content = $(self.id).text();

				// here hidding loading indicator
				$("#load-indic-buf-"+(buffNum+1)).hide();
				$("#load-indic-div-"+(buffNum+1)).css("z-index", -150);

				self.updateMatchings();
			});
		});
	};

	/////////////////////////////////
	// Buffers array initialization
	/////////////////////////////////

	var buffers = [];
	for (var i = 0; i < 6; i++) {
		var newID = "#buffer-"+(i+1);
		var newOverlayID = "#buffer-overlay-"+(i+1);
		buffers[i] = new Buffer(newID, newOverlayID);
		buffers[i].size = $(buffers[i].id).text().length;
		buffers[i].update();
	}

	////////////////////////////////////////////
	/*--------------Sound engine--------------*/
	////////////////////////////////////////////

	// Buffer-1 scheduler
	Tone.Transport.scheduleRepeat(function() {
		if (buffers[0].size > 0) {
			buffers[0].highlightText();

			buffers[0].position++;
		}
	}, "16n", "0");

	// Buffer-2 scheduler
	Tone.Transport.scheduleRepeat(function() {
		if (buffers[1].size > 0) {
			buffers[1].highlightText();

			buffers[1].position++;
		}
	}, "16n", "0");

	// Buffer-3 scheduler
	Tone.Transport.scheduleRepeat(function() {
		if (buffers[2].size > 0) {
			buffers[2].highlightText();

			buffers[2].position++;
		}
	}, "16n", "0");

	// Buffer-4 scheduler
	Tone.Transport.scheduleRepeat(function() {
		if (buffers[3].size > 0) {
			buffers[3].highlightText();

			buffers[3].position++;
		}
	}, "16n", "0");

	// Buffer-5 scheduler
	Tone.Transport.scheduleRepeat(function() {
		if (buffers[4].size > 0) {
			buffers[4].highlightText();

			buffers[4].position++;
		}
	}, "16n", "0");

	// Buffer-6 scheduler
	Tone.Transport.scheduleRepeat(function() {
		if (buffers[5].size > 0) {
			buffers[5].highlightText();

			buffers[5].position++;
		}
	}, "16n", "0");

	// Transport
	function play() {
		Tone.Transport.start();
	}

	function pause() {
		Tone.Transport.pause();
	}

	function rewind() {
		Tone.Transport.position = "0:0:0";
		buffers.forEach(function(buf) {
			buf.position = 0;
			buf.highlightText();
		});
	}

	//////////////////////////////////////
	/*----------------UI----------------*/
	//////////////////////////////////////

	// Transport buttons
	$("#play-button").click(function() {
		play();
		$(this).toggle();
		$("#pause-button").toggle();
	});

	$("#pause-button").click(function() {
		pause();
		$(this).toggle();
		$("#play-button").toggle();
	});

	$("#rewind-button").mousedown(function() {
		rewind();
		$(this).toggle();
		$("#rewind-button-mousedown").toggle();
	});

	$("#rewind-button-mousedown").mouseup(function() {
		$(this).toggle();
		$("#rewind-button").toggle();
	});

	// Expression
	function updateExpression(expr) {
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

		buffers.forEach(function(buf) {
			buf.updateMatchings();
		});
	}

	$("#expression-input").on("keydown",function search(e) {
		if(e.keyCode == 13) {
			updateExpression($(this).val());
		}
	});

	$("#expression-input").focusout(function() {
		updateExpression($(this).val());
	});

	updateExpression($("#expression-input").val());

	// Tracklist
	function trackDidChangeTo(track) {
		// alert("track changed to: " + track);
		switch (track) {
			case "1":
			Tone.Transport.bpm = 120;
			buffers.forEach(function(buf) {
				buf.update();
			});
			break;

			case "2":
			buffers.forEach(function(buf) {
				buf.update();
			});
			break;

			case "3":
			buffers.forEach(function(buf) {
				buf.update();
			});
			break;

			case "4":
			buffers.forEach(function(buf) {
				buf.update();
			});
			break;

			default:
			break;
		}
	}

	$("#tracklist").children("li").click(function() {
		$("#tracklist").children("li").removeClass("current-track");
		$(this).addClass("current-track");

		trackDidChangeTo($(this).text());
	});

});

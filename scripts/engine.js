$(function() {

	var expression,
	buffers = [],
	colors = ["#F800B4", "#3CDE00", "#B5F300", "#F20026", "#000000"],
	bgfg = ["color", "background-color"];

	function Buffer(id) {
		this.size = 0;
		this.position = 0;
		this.id = id;
		this.overlayID = "";
		this.content = $(this.id).text();
		this.map = {};
		this.allMatchedIndexes = [];

	}

	////////////////////////////////////////////////////////
	// Shows matching for buffer and cursor incrementation
	////////////////////////////////////////////////////////

	Buffer.prototype.highlightText = function () {
		this.position %= this.size;
		var output;

		if (this.allMatchedIndexes.indexOf(this.position) > -1) {

			var highlightStr = this.map[this.position];

			// cursor highlighting
			output = this.content.substr(0, this.position) +
			"<span class=\"playing-symbol\">" +
			this.content.substr(this.position, highlightStr.length) +
			"</span>" +
			this.content.substr(this.position+highlightStr.length);

			// changing text in the highlight view
			$(this.overlayID+" span").html(highlightStr);
			this.position+=(highlightStr.length-1);

			// changing font size in the highlight view
			var newFontSize = highlightStr.length == 1 ? 8 : 9/Math.pow(2, Math.log(highlightStr.length));
			$(this.overlayID).css("font-size", newFontSize+"vw");

			if ($(this.overlayID).css("opacity") <= 1) {

				// Color changing
				var newColorIndex = Math.floor(Math.random()*colors.length);
				var newBgfgIndex = Math.floor(Math.random()*2);

				var cssObj = {};
				cssObj[bgfg[newBgfgIndex]] = colors[newColorIndex];
				cssObj[bgfg[1-newBgfgIndex]] = "#ffffff";

				$(this.overlayID).css(cssObj);

				// showing highlight
				$(this.overlayID).stop().fadeTo(100, 1);

				// hidding text buffer
				$(this.id).stop().fadeTo(100, 0);
			}


		} else {
			// cursor highlighting
			output = this.content.substr(0, this.position) +
			"<span class=\"playing-symbol\">" +
			this.content.substr(this.position, 1) +
			"</span>" +
			this.content.substr(this.position+1);

			// hidding highlight view
			if ($(this.overlayID).css("opacity") == 1) {
				$(this.overlayID).fadeTo(1000, 0);
				$(this.id).fadeTo(1000, 1);
			}
		}

		// changing text to new output (with cursor highlighting tag)
		$(this.id).html(output);
	};

	//////////////////////////////////////////////////////////////
	// Updates matchings in text using new expression as argument
	//////////////////////////////////////////////////////////////

	Buffer.prototype.updateMatchings = function(expression) {
		this.map = {};
		this.allMatchedIndexes = [];

		var match;
		while ((match = expression.exec(this.content)) !== null) {
			this.map[match.index] = match[0];
			this.allMatchedIndexes.push(match.index);
		}
	};

	////////////////////////////////////////
	// create buffers array and assign ids
	////////////////////////////////////////

	for (var i = 0; i < 6; i++) {
		var newID = "#buffer-"+(i+1);
		buffers[i] = new Buffer(newID);
		buffers[i].size = $(buffers[i].id).text().length;
		buffers[i].overlayID = "#buffer-overlay-"+(i+1);
	}

	// Buffer-1 scheduler
	Tone.Transport.scheduleRepeat(function() {
		if (buffers[0].size > 0) {
			buffers[0].highlightText();

			buffers[0].position++;
		}
	}, "16n", "0");

	// Buffer-2 scheduler
	Tone.Transport.scheduleRepeat(function() {
	}, "8n", "0");

	// Buffer-3 scheduler
	Tone.Transport.scheduleRepeat(function() {
	}, "8n", "0");

	// Buffer-4 scheduler
	Tone.Transport.scheduleRepeat(function() {
	}, "8n", "0");

	// Buffer-5 scheduler
	Tone.Transport.scheduleRepeat(function() {
	}, "8n", "0");

	// Buffer-6 scheduler
	Tone.Transport.scheduleRepeat(function() {
	}, "8n", "0");

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

	// Expression
	function updateExpression(expr) {

		if (expr !== "") {
			try {
				expression = new RegExp(expr, "gm");
			} catch (e) {
				alert(e);
				$("#expression-input").val(expression.source);
			}
		} else {
			alert("This field cannot be empty.");
			$("#expression-input").val(expression.source);
		}

		buffers.forEach(function(buf) {
			buf.updateMatchings(expression);
		});
	}

	// Buffers
	function updateBuffer(bufferID) {
		var buffNum = parseInt(bufferID.slice(-1)) - 1;

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

			//If the expected response is text/plain
			$(bufferID).html(str).promise().done(function() {

				buffers[buffNum].size = $(bufferID).text().length;
				if (buffers[buffNum].position > buffers[buffNum].size) {
					buffers[buffNum].position = 0;
				}

				buffers[buffNum].content = $(bufferID).text();

				// here hidding loading indicator
				$("#load-indic-buf-"+(buffNum+1)).hide();
				$("#load-indic-div-"+(buffNum+1)).css("z-index", -150);
				updateExpression($("#expression-input").val());
			});

			//If the expected response is JSON
			//var response = $.parseJSON(data.contents);
		});
	}

	// Tracklist
	function changeTrack(track) {
		// alert("track changed to: " + track);
		switch (track) {
			case "1":
			Tone.Transport.bpm = 120;
			buffers.forEach(function(buf) {
				updateBuffer(buf.id);
			});
			break;

			case "2":
			buffers.forEach(function(buf) {
				updateBuffer(buf.id);
			});
			break;

			case "3":
			buffers.forEach(function(buf) {
				updateBuffer(buf.id);
			});
			break;

			case "4":
			buffers.forEach(function(buf) {
				updateBuffer(buf.id);
			});
			break;

			default:
			break;
		}
	}

	/*------------------UI Actions-----------------*/

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
	$("#expression-input").on("keydown",function search(e) {
		if(e.keyCode == 13) {
			updateExpression($(this).val());
		}
	});

	// Tracklist
	$("#tracklist").children("li").click(function() {
		$("#tracklist").children("li").removeClass("current-track");
		$(this).addClass("current-track");
		changeTrack($(this).text());
	});

	//-----------Initializations
	buffers.forEach(function(buf) {
		updateBuffer(buf.id);
	});

});

$(function() {
	var samplesFormat = Tone.Buffer.supportsType("mp3") ? "mp3" : "ogg";
	var trackData = JSON.parse(data);
	var numberOfTracks = 4;
	
	// Player responsible for loading a track data and playing events.
	var Player = {};
	Player.buffers = [];
	Player.trackNumber = 1;
	Player.data = {};
	Player.sampler = {};
	Player.samples = {};
	
	// Buffer is a text buffer. It's responsible for working with text
	// (loading data from Wikipedia, increment cursor, highlighting etc.)
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
		this.isPlayed = false;
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
	// Increments the cursor
	//////////////////////////////////////////////////////////////
	
	Buffer.prototype.updatePosition = function () {
		var self = this;
		
		if (self.size > 0) {
			self.highlightText();
			Player.onBufferDidChangePosition(self);
			self.position++;

			if (self.position === self.size) {
				// обозначение буфера как воспроизведенного
				self.isPlayed = true;
				
				// поиск невоспроизведенного целиком буфера в массиве буферов
				var didFoundNotPlayedBuffer = Player.buffers.find(function(item) {
					return !item.isPlayed;
				});
				
				// запуск следующего трека, если все буферы проиграли хотя бы по разу
				if (didFoundNotPlayedBuffer === undefined) {
					//play next track
					Player.didFinishedPlayingTrack();
				}
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
  Buffer.prototype.update = function(textContent) {
    var self = this;
    var buffNum = parseInt(this.id.slice(-1)) - 1;

    // loading text into buffer
    $(self.id).html(textContent).promise().done(function() {

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
  };

	////////////////////////////////////////
	/*-------------- Player --------------*/
	////////////////////////////////////////
	
	Player.play = function() {
		Tone.Transport.start();
		if (Tone.context.state === "suspended") {
			Tone.context.resume();
		}
	};

  //
  // Pause
  //

	Player.pause = function() {
		Tone.Transport.pause();
	};

  //
  // Rewind
  //

	Player.rewind = function() {
		Tone.Transport.position = "0:0:0";
		
		// reset buffers
		Player.buffers.forEach(function(buf) {
			buf.isPlayed = false;
			buf.position = 0;
			buf.currentParagraphIndex = 0;
			buf.previousParagraphLength = 0;
			buf.lastParagraphNumber = 0;
			buf.highlightText();
		});
		
		Player.updateScheduler();
		
		// stop all playing sounds
		if (Player.sampler instanceof Tone.MultiPlayer) {
			Player.sampler.stopAll(0);
		}
	};

  //
  // on player did finished playing track
  //

	Player.didFinishedPlayingTrack = function() {
		Player.trackNumber = Player.trackNumber > (numberOfTracks-1) ? 1 : ++Player.trackNumber ;
		var strTrNum = ""+Player.trackNumber;

		Player.willPlayTrack(strTrNum, Player.play);

		// view
		$("#tracklist").children("li").removeClass("current-track");
		$("#tracklist li:nth-child("+strTrNum+")").addClass("current-track");
	};
  
  //
  // on buffer did change position
  //
	
	Player.onBufferDidChangePosition = function(buf) {
		var highlightStr = buf.map[buf.position];

		// playing sample
		var sampleToPlay;
    if (this.data[buf.id].playSequence) {
      sampleToPlay = buf.id + "." + (buf.position%6+1);
    } else {
      sampleToPlay = buf.id + "." + this.data.matchings[highlightStr];
    }

		if (this.data.matchings[highlightStr] || this.data[buf.id].playSequence) {
			this.data[buf.id].initialSampleID = sampleToPlay;
			this.sampler.start(sampleToPlay);
			
			// pause if event should be paused on matched
			if (this.data[buf.id].shouldPauseEventOnMatch) {
				// stop event
				this.data[buf.id].event.stop();
				
				// calculate when event should return
				var currentBar = parseInt(Tone.Transport.position.split(':')[0]);
				var newStartingPosition = currentBar + this.data[buf.id].pauseLength + 'm';
				
				// schedule event to new position
				this.data[buf.id].event.start(newStartingPosition);
			}
			
		} else if (this.data[buf.id].isLoop) {
			// if isLoop play the same sample or the initial one
			this.sampler.start(this.data[buf.id].initialSampleID);
		}
	};

  //
  // update scheduler
  //
	
	/// Cancel all previously scheduled events and schedule new
	Player.updateScheduler = function() {
		// Cleanup timeline from events
		Tone.Transport.cancel(0);
		
		// Schedule events
		Player.buffers.forEach(function(buf) {
			Player.data[buf.id].event = new Tone.Loop(function() {
				buf.updatePosition();
			}, Player.data[buf.id].eventLength).start(0);
		});
	};
	

  //
  // Fetch articles
	// downloads new texts from wikipedia and reloads buffer content
	//
  Player.updateBuffers = function() {
    var self = this;
    // var buffNum = parseInt(this.id.slice(-1)) - 1;
// 
    // // showing loading indicator
    // $("#load-indic-buf-"+(buffNum+1)).show();
		// $("#load-indic-div-"+(buffNum+1)).css("z-index", 150);


    // здесь нужно выполнять запрос с официальным API
    // то есть нужно переписать, какой API использовать
    // напишу в заметках по этому проект

		$.getJSON('https://en.wikipedia.org/w/api.php?action=query&generator=random&grnnamespace=0&prop=extracts&exchars=1000&grnlimit=6&exlimit=6&exintro&format=json&callback=?',
		function (data) {
			// data editing
      // var obj = JSON.parse(data);
			// var str = "";
			// // remove all the imgs from data to prevent 404 on using the data
			// // with jquery
			// var htmlStr = data.contents.replace(/<\/?img.*>/gm, '');
			// $(htmlStr).find("#mw-content-text p").each(function() {
				// str += "<p>"+$(this).text()+"</p>";
			// });
// 
      // здесь обновляем буферы
      // console.log(data.query.pages);
      var n = 0;
      for (var page in data.query.pages) {
        var content = data.query.pages[page].extract;
        Player.buffers[n++].update(content);
      }
		});

  };

	Player.willPlayTrack = function(track, buffersLoadingCallback) {
		// Update buffers
    Player.updateBuffers();

		// Update expression
		var expr = trackData[track-1].expression;
		$("#expression-input").val(expr);
		expressionDidUpdateWith(expr);

		// Update tempo
		Tone.Transport.bpm.value = trackData[track-1].tempo;
		
		// Set track number
		Player.trackNumber = track;
		
		// Set data
		Player.data = trackData[track-1];

		// Reset playing state
		Player.pause();
		Player.rewind();

		// hide transport buttons and show buffers loading indicator
		$("#play-button").hide();
		$("#pause-button").hide();
		$("#rewind-button").hide();
		$("#loading-buffers-indicator").show();

    // add extensions to samples
    var samplemapWithExt = {};
    for (var key in Player.data.samplemap) {
      samplemapWithExt[key] = Player.data.samplemap[key] + '.' + samplesFormat;
    }
    
		// Load samples bank
		Player.samples = new Tone.Buffers(samplemapWithExt, function() {
			$("#play-button").show();
			$("#rewind-button").show();
			$("#loading-buffers-indicator").hide();
			buffersLoadingCallback();
		});
		
		// Init a sampler with a new bank
		Player.sampler = new Tone.MultiPlayer(Player.samples).toMaster();
		
		Player.updateScheduler();
	};

	//////////////////////////////////////
	/*----------------UI----------------*/
	//////////////////////////////////////

	// Transport buttons
	$("#play-button").click(function() {
		Player.play();
		$(this).toggle();
		$("#pause-button").toggle();
	});

	$("#pause-button").click(function() {
		Player.pause();
		$(this).toggle();
		$("#play-button").toggle();
	});

	$("#rewind-button").mousedown(function() {
		Player.rewind();
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

		Player.buffers.forEach(function(buf) {
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

		Player.willPlayTrack($(this).text(), function(){});
	});

	//-----------------
	// INITIALIZATIONS
	//-----------------

	// buffers
  for (var i = 0; i < 6; i++) {
    var newID = "#buffer-"+(i+1);
    var newOverlayID = "#buffer-overlay-"+(i+1);
    Player.buffers[i] = new Buffer(newID, newOverlayID);
    Player.buffers[i].size = $(Player.buffers[i].id).text().length;
  }
  Player.updateBuffers();

	// set track to first
	Player.willPlayTrack("1", function(){});
});

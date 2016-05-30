
// Сэмплы загружаются сразу все в первый раз. Чтобы не было пауз при переклю-
// чении трека. Все настройки треков сохраняются в сессии. То есть в реальном
// времени можно быстро переключать их и изменять, а потом переключать на
// старые, а там все последние изменения сохранены (то есть не сбивается в
// по-умолчанию).

/*
FIXME:
когда страница загружается в первый раз, при нажатии на play ничего не происходит.
После обновления страницы проблема решается...

у хайлайта margin-bottom должен меняться с размером шрифта, это не так сильно
заметно, но можно и сделать. Можно, например, во 2-ой версии.

TODO:
можно делать твеорческую часть, порядок действий:
- определить тексты для буферов каждого трека;
- составить карту сэмплов - определить каким буквам/слогам/словам какие
сэмплы будут соответствовать;
- сделать сэмплы;
- написать выражения для нахождений этих сэмплов (букв/слогов/слов);
- имплементация проигрывания звука в коде.

favicon;

изменение буферов и выражений в зависимости от трека должны быть в функции
changeTrack();

copyright;

help! (большой вопрос внизу по центру или где-нибудь просто "wtf?").

нужно помнить о том, что некоторые браузеры не работают с .mp3. Решить эту
проблему нужно будет также, как я делал с .ogg - определение браузера, и
переменной, хранящей расширение файла (ogg или mp3), а файлы будут с одинако-
выми именами.
*/

$(function() {

	var expression;
	var colors = ["#F800B4", "#3CDE00", "#B5F300", "#F20026", "#000000"];
	var bgfg = ["color", "background-color"];

	function Buffer() {
		var self = this;
		this.size = 0;
		this.position = 0;
		this.id = "";
		this.overlayID = "";
		this.focus = false;
		this.content = $(this.id).text();
		this.map = {};
		this.allMatchedIndexes = [];

		this.highlightText = function() {
			if (!this.focus) {
				this.position %= this.size;
				var output;

				if (this.allMatchedIndexes.indexOf(this.position) > -1 && !this.focus) {

					var highlightStr = this.map[this.position];

					// cursor highlighting
					output = this.content.substr(0, this.position) +
					"<span class=\"playing-symbol\">" +
					this.content.substr(this.position, highlightStr.length) +
					"</span>" +
					this.content.substr(this.position+highlightStr.length);

					// changing text in the highlight view
					$(this.overlayID+" span").html(highlightStr);
					this.position+=(highlightStr.length-1)

					// changing font size in the highlight view
					var newFontSize = highlightStr.length == 1 ? 8 : 9/Math.pow(2, Math.log(highlightStr.length));
					$(this.overlayID).css("font-size", newFontSize+"vw");

					if ($(this.overlayID).css("opacity") <= 1) {

						// Color changing
						var newColorIndex = Math.floor(Math.random()*colors.length);
						var newBgfgIndex = Math.floor(Math.random()*2);

						var cssObj = new Object();
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
			}
		};

	}

	var buffers = [];
	for (var i = 0; i < 6; i++) {
		buffers[i] = new Buffer();
		buffers[i].id = "#buffer-"+(i+1);
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

			buf.map = {};
			buf.allMatchedIndexes = [];

			var match;
			while ((match = expression.exec(buf.content)) !== null) {
				buf.map[match.index] = match[0];
				buf.allMatchedIndexes.push(match.index);
			}
		});
	}

	// Buffers
	function updateBuffer(bufferID) {
		var buffNum = parseInt(bufferID.slice(-1)) - 1;

		buffers[buffNum].size = $(bufferID).text().length;
		if (buffers[buffNum].position > buffers[buffNum].size) {
			buffers[buffNum].position = 0;
		}

		buffers[buffNum].content = $(bufferID).text();
	}

	// Tracklist
	function changeTrack(track) {
		alert("track changed to: " + track);
		switch (track) {
			case "1":
			Tone.Transport.bpm = 120;
			break;

			case "2":
			break;

			case "3":
			break;

			case "4":
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

	// Text buffer
	$(".text-buffer").keyup(function() {
		updateBuffer("#"+$(this).attr("id"));
	});

	$(".text-buffer").focusin(function() {
		var buffNum = parseInt($(this).attr("id").slice(-1)) - 1;
		buffers[buffNum].focus = true;
		$(buffers[buffNum].overlayID).stop().fadeTo(200, 0);
		$(buffers[buffNum].id).stop().fadeTo(200, 1);
		$(this).html($(this).text());
	});

	$(".text-buffer").focusout(function() {
		var buffNum = parseInt($(this).attr("id").slice(-1)) - 1;
		buffers[buffNum].focus = false;
		if (buffers[buffNum].content === "") {
			buffers[buffNum].content = " ";
		}
		updateExpression($("#expression-input").val());
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

	updateExpression($("#expression-input").val());

});

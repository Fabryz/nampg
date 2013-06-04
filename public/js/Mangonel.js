(function(exports) {

	var Mangonel = function() {
		var tick = 0;

		var desiredFPS = 60,
			allowSendEvery = 75,
			isReady = true,
			isPlaying = false,
			fps_handle = $('#fps'),
			debugPanel = $('#debug'),
			scoreboard = $("#scoreboard"),
			keyboard = KEYCODES;

		var player = new Player(),
			players = [];

		var fps = new Fps(2000),
			socket = new io.connect(window.location.href);

		var canvas = $('#canvas'),
			ctx = canvas.get(0).getContext("2d"),
			canvasWidth = canvas.width(),
			canvasHeight = canvas.height();

		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.font = "15px Monospace";

		var mouseX,
			mouseY,
			mouseSize = 10,
			mousePressed = false,
			allowed = 100;

		function calcDistance(point1, point2) {
			var dx = point2.x - point1.x;
			var dy = point2.y - point1.y;

			return Math.sqrt(dx * dx + dy * dy);
		}

		function calcAngle(point1, point2) {
			//var dx = Math.abs(point2.x - point1.x);
			//var dy = Math.abs(point2.y - point1.y);

			var dx = point2.x - point1.x;
			var dy = point2.y - point1.y;

			return Math.atan2(dy, dx);
		}

		$(canvas).bind("mousedown", function(e) {
			e.preventDefault();
			mousePressed = true;

			mouseX = e.offsetX || e.layerX;
			mouseY = e.offsetY || e.layerY;
		});

		$(canvas).bind("mousemove", function(e) {
			mouseX = e.offsetX || e.layerX;
			mouseY = e.offsetY || e.layerY;
		});

		$(canvas).bind("mousepress", function(e) {
			
		});

		$(canvas).bind("mouseup", function(e) {
			mousePressed = false;
		});

		function drawClick() {
			if (mousePressed) {
				var coords = mapToVp(player.x, player.y);

				ctx.save();
				ctx.strokeStyle = "rgb(0, 0, 255)";
				ctx.fillRect(mouseX - mouseSize / 2, mouseY - mouseSize / 2, mouseSize, mouseSize);
				ctx.beginPath();
				ctx.moveTo(coords.x + player.centerX, coords.y + player.centerY);
				ctx.lineTo(mouseX, mouseY);
				ctx.stroke();
				ctx.restore();
			}
		}

		function toRadians(alpha) {
			return alpha * (Math.PI / 180);
		}

		function toDegrees(alpha) {
			return alpha * (180 / Math.PI);
		}

		var debug = function(msg) {
			console.log(msg);
		};

		var stop = function() {
			isPlaying = false;
			debug('* Mangonel stopped.');
		};

		var toggleDebugPanel = function(spd) {
			var speed = spd || 'fast';

			debugPanel.stop();
			debugPanel.fadeToggle(speed);
			debugPanel.toggleClass("active");
			if (debugPanel.hasClass("active")) {

			} else {

			}
		};

		var showScoreboard = function() {
			var list = scoreboard.find('ul');

			list.html('');
			var length = players.length;
			for(var i = 0; i < length; i++) {
				list.append("<li>"+ players[i] +"</li>");
			}

			list.append("<li>&nbsp;</li>");
			list.append("<li>Total players: "+ length +"</li>");
			scoreboard.show();
		};

		var start = function() {
			if (isReady) {
				debug('* Mangonel started.');
				isPlaying = true;

				$(window).keydown(function(e) {
					//e.preventDefault();

					switch(e.keyCode) {
						case keyboard.left_arrow:
						case keyboard.a:
								player.moveLeft = true;
							break;
						case keyboard.right_arrow:
						case keyboard.d:
								player.moveRight = true;
							break;
						case keyboard.up_arrow:
						case keyboard.w:
								player.moveUp = true;
							break;
						case keyboard.down_arrow:
						case keyboard.s:
								player.moveDown = true;
							break;

						case keyboard.tab:
								e.preventDefault();
								showScoreboard();
							break;

						default:
							break;
					}

				});

				$(window).keypress(function(e) {
					//e.preventDefault();
					var keyCode = e.keyCode;

				});

				$(window).keyup(function(e) {
					//e.preventDefault();

					switch(e.keyCode) {
						case keyboard.left_arrow:
						case keyboard.a:
								player.moveLeft = false;
							break;
						case keyboard.right_arrow:
						case keyboard.d:
								player.moveRight = false;
							break;
						case keyboard.up_arrow:
						case keyboard.w:
								player.moveUp = false;
							break;
						case keyboard.down_arrow:
						case keyboard.s:
								player.moveDown = false;
							break;

						case keyboard.backslash:
								toggleDebugPanel();
							break;
						case keyboard.tab:
								scoreboard.hide();
							break;

						default:
							break;
					}

				});

				fps.init(fps_handle);

				loop();
			} else {
				debug('* Mangonel not ready.');
			}
		};

		// send a movement every allowSendEvery milliseconds
		var sendMovement = function() {
			var nowMove;

			if (player.hasMoved()) {
				var dir = 'idle';

				if (player.moveLeft) {
					dir = 'l';
				}
				if (player.moveRight) {
					dir = 'r';
				}
				if (player.moveUp) {
					dir = 'u';
				}
				if (player.moveDown) {
					dir = 'd';
				}

				player.lastMoveDir = dir;

				nowMove = Date.now();
				if ((nowMove - player.lastMoveTime) > allowSendEvery) {
					socket.emit('play', { id: player.id, dir: dir });
					player.lastMoveTime = Date.now();
				}
			}
		};

		var drawPlayer = function(p) {
			var coords = mapToVp(p.x, p.y);

			ctx.save();

			ctx.translate(coords.x + (p.width / 2), coords.y + (p.height / 2));
			ctx.beginPath();
			ctx.fillStyle = "#FFF";

			switch(p.lastMoveDir) {
				case 'l':
						ctx.moveTo(0, 5);
						ctx.lineTo(0, -5);
						ctx.lineTo(-5, 0);
					break;
				case 'r':
						ctx.moveTo(0, 5);
						ctx.lineTo(0, -5);
						ctx.lineTo(5, 0);
					break;
				case 'u':
						ctx.moveTo(-5, 0);
						ctx.lineTo(5, 0);
						ctx.lineTo(0, -5);
					break;
				case 'd':
						ctx.moveTo(-5, 0);
						ctx.lineTo(5, 0);
						ctx.lineTo(0, 5);
					break;
			}

			ctx.closePath();
			ctx.fill();

			ctx.restore();

			//ctx.fillRect(coords.x, coords.y, p.width, p.height);
		};

		var drawActor = function(actor) {
			rect(paddlex, canvasHeight - paddleh, paddlew, paddleh);


		};

function rect(x,y,w,h) {
  ctx.beginPath();
  ctx.rect(x,y,w,h);
  ctx.closePath();
  ctx.fill();
}

function circle(x,y,r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2, true);
  ctx.closePath();
  ctx.fill();
}

var x = 140;
var y = 150;
var dx = 2;
var dy = 4;

var paddlex;
var paddleh;
var paddlew;

paddlex = canvasWidth / 3;
paddleh = 10;
paddlew = 75;

		var loop = function() {
			ctx.clearRect(0, 0, canvasWidth, canvasHeight);

			if (isPlaying) {
				circle(x, y, 10);

				sendMovement();


				if (mousePressed) {
					
				}

				if (player.moveRight && ((paddlex + 5 + paddlew) < canvasWidth) ) {
					paddlex += 5;
				} else {
						if (player.moveLeft && ((paddlex - 5) > 0) ) {
							paddlex -= 5;
						}
				}
				rect(paddlex, canvasHeight - paddleh, paddlew, paddleh);

				// drawActor(player);
				// drawActor(player2);

				if (x + dx > canvasWidth || x + dx < 0) {
				    dx = -dx;
				}

				if (y + dy < 0) {
					dy = -dy;
				} else {
					if (y + dy > canvasHeight) {
						if (x > paddlex && x < paddlex + paddlew){
							dy = -dy;
						} else {
							//stop();
							isPlaying = false;
							gameOver = true;
							console.log("Game over");
						}
					}
				}
				 
				  x += dx;
				  y += dy;

				fps.count++;
				tick++;
				requestAnimationFrame(loop);
			}
		};

		socket.on('join', function(data) {
			jQuery.extend(true, player, data.player);

			debug('You have joined the server. (id: '+ player.id +').');
		});

		socket.on('quit', function(data) {
			var quitter = '';

			var length = players.length;
			for(var i = 0; i < length; i++) {
				if (players[i].id == data.id) {
					quitter = players[i].nick;
					players.splice(i, 1);
					break;
				}
			}

			debug('< Player quitted: '+ quitter +' (id '+ data.id +')');
		});

		socket.on('newplayer', function(data) {
			var newPlayer = new Player();
			jQuery.extend(true, newPlayer, data.player);
			players.push(newPlayer);

			debug('> New player joined: '+ newPlayer.nick +' (id: '+ newPlayer.id +').');
			newPlayer = {};
		});

		socket.on('playerlist', function(data) {
			players = []; //prepare for new list

			var length = data.list.length;
			for(var i = 0; i < length; i++) {
				var tmpPlayer = new Player();
				jQuery.extend(true, tmpPlayer, data.list[i]);

				players.push(tmpPlayer);
				tmpPlayer = {};
			}

			debug('Initial player list received: '+ length +' players.');
		});

		socket.on('play', function(data) {
			var length = players.length;
			for(var i = 0; i < length; i++) {
				if (players[i].id == data.id) {
					players[i].x = data.x;
					players[i].y = data.y;
					players[i].lastMoveDir = data.dir;
					if (player.id == data.id) {
						player.x = data.x;
						player.y = data.y;
						player.lastMoveDir = data.dir;
					}
				}
			}
		});

		socket.on('updatePlayerField', function(data) {
			console.log(data);

			var length = players.length;
			for(var i = 0; i < length; i++) {
				if (players[i].id == data.player.id) {
					players[i][data.field] = data.newValue;
					if (player.id == data.player.id) {
						player[data.field] = data.newValue;
					}
				}
			}
		});

		socket.on('ping', function(data) {
			socket.emit('pong', { time: Date.now() });
			//debug('Ping? Pong!');
		});

		socket.on('pingupdate', function(data) {
			var length = players.length;
			for(var i = 0; i < length; i++) {
				if (players[i].id == data.id) {
					players[i].ping = data.ping;
					if (player.id == data.id) {
						player.ping = data.ping;
						$("#ping").html(player.ping +'ms');
					}
				}
			}
		});

		return {
			socket: socket,
			keyboard: keyboard,
			player: player,
			players: players,
			desiredFPS: desiredFPS,
			allowSendEvery: allowSendEvery,
			isReady: isReady,
			isPlaying: isPlaying,
			fps: fps,
			canvas: canvas,
			ctx: ctx,
			canvasWidth: canvasWidth,
			canvasHeight: canvasHeight,

			debug: debug,
			start: start,
			stop: stop,
			loop: loop,
			toggleDebugPanel: toggleDebugPanel
		};
	};

	exports.Mangonel = Mangonel;
})(typeof global === "undefined" ? window : exports);
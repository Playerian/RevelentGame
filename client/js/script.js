
// JavaScript File
/*global io $ navigator Image*/

//socket init
//var socket = io.connect(window.location.href);

//canvas init
var c = document.getElementById("canvas");
var ctx = c.getContext("2d");
var camera = {
    x: 0,
    y: 0
}
var rectSize = 15;
$('#canvasDiv').css('width', (rectSize * 32) + 'px');
$('#canvasDiv').css('height', (rectSize * 32) + 'px');

var wall = $('<img>').attr('src', 'img/wall.png')[0];
var road = $('<img>').attr('src', 'img/road.png')[0];

var map1 = [
  ['r','r','r','r','r','r','t','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r'],
  ['r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','t','r','r','r','r','r','n','r'],
  ['r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r'],
  ['r','r','r','r','r','r','w','w','w','w','r','w','w','w','w','w','w','w','r','w','w','w','w','w','r','r','r','r','r','r'],
  ['r','r','r','r','r','r','r','w','w','r','r','r','r','w','w','w','w','r','r','w','w','w','w','r','r','t','r','r','r','r'],
  ['t','r','r','w','r','r','r','w','r','r','w','w','r','r','w','w','r','r','w','w','w','w','r','r','r','r','r','r','r','r'],
  ['r','r','r','w','w','r','r','r','r','w','w','w','w','r','r','r','r','r','w','w','w','r','r','r','r','r','w','r','r','r'],
  ['r','r','r','w','w','w','r','r','r','r','s','w','w','w','w','r','r','r','r','r','r','r','r','r','r','w','w','r','t','r'],
  ['r','r','r','w','w','r','r','r','r','r','r','w','w','w','w','w','w','w','r','r','r','r','r','r','w','w','w','r','r','r'],
  ['r','r','r','w','r','r','r','w','r','r','r','w','w','w','w','w','w','w','r','r','r','r','r','w','w','w','w','r','r','r'],
  ['r','r','r','r','r','r','w','w','w','r','r','r','w','w','w','w','w','r','r','r','r','r','w','w','w','r','r','r','r','r'],
  ['r','r','r','r','r','w','w','w','r','r','r','r','r','w','w','w','r','r','r','r','r','w','w','w','w','r','r','r','r','r'],
  ['r','r','r','r','r','w','w','r','r','r','r','r','r','r','w','r','r','r','r','t','r','w','w','w','r','r','w','r','r','r'],
  ['r','r','r','w','r','w','r','r','w','w','w','w','r','r','r','r','r','r','r','w','r','w','w','w','r','w','w','r','r','r'],
  ['r','r','r','w','r','r','r','r','r','w','w','w','w','r','r','r','r','r','w','w','r','r','w','w','r','w','w','r','r','r'],
  ['r','r','r','w','w','r','w','r','r','w','w','w','r','r','r','r','r','w','w','w','w','r','r','r','r','r','w','r','r','r'],
  ['r','r','r','w','w','r','w','w','r','w','w','r','r','r','r','r','r','r','w','w','w','w','r','r','w','r','w','r','r','r'],
  ['r','r','r','w','r','r','w','w','r','w','t','r','r','r','r','w','r','r','r','r','r','r','r','w','w','r','r','r','r','r'],
  ['r','r','r','r','r','w','w','w','r','r','r','r','r','r','w','w','w','r','r','r','r','r','r','w','w','r','r','r','r','r'],
  ['r','r','r','r','r','w','w','w','r','r','r','r','r','w','w','w','w','r','r','r','r','w','w','w','r','r','r','r','r','r'],
  ['r','r','r','w','w','w','w','r','r','r','r','r','w','w','w','w','w','r','w','r','r','r','w','r','r','r','w','r','r','r'],
  ['r','r','r','w','w','w','r','r','r','r','r','r','r','r','w','w','r','r','w','r','r','r','r','r','r','w','w','r','r','r'],
  ['r','t','r','w','w','r','r','r','r','r','w','w','w','r','r','r','r','r','w','d','r','r','r','r','w','w','w','r','r','r'],
  ['r','r','r','w','r','r','r','r','r','w','w','w','w','r','r','r','w','r','r','w','w','w','r','r','r','w','w','r','r','r'],
  ['r','r','r','r','r','r','r','r','w','w','w','w','r','r','w','w','w','w','r','r','w','r','r','r','r','r','w','r','r','t'],
  ['r','r','r','r','t','r','r','w','w','w','w','r','r','w','w','w','w','w','w','r','r','r','w','w','r','r','r','r','r','r'],
  ['r','r','r','r','r','r','w','w','w','w','w','r','w','w','w','w','w','w','w','w','r','w','w','w','w','r','r','r','r','r'],
  ['r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r'],
  ['r','n','r','r','r','r','t','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r'],
  ['r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','r','t','r','r','r','r','r']
];

var game = {};
//map class
function Mapping(map){
    map.forEach(function(v, i){
        v.forEach(function(v2, i2){
            if (v2 === 'r' || v2 === 'n' || v2 === 't'){
                ctx.drawImage(road, i2 * 32, i * 32);
            }else if (v2 === 'w'){
                ctx.drawImage(wall, i2 * 32, i * 32);
            }
        });
    });
    this.image = new Image();
	this.image.src = ctx.canvas.toDataURL("image/png");
	ctx.clearRect(0,0,c.width, c.height)
}
Mapping.prototype.draw = function(context, x, y){
    ctx.clearRect(0,0,c.width, c.height)
    var dx = 0, dy = 0;
    var sx = x, sy = y;
    var sWidth =  rectSize * 32;
	var sHeight = rectSize * 32;

	// if cropped image is smaller than canvas we need to change the source dimensions
	if(this.image.width - sx < sWidth){
		sWidth = this.image.width - sx;
	}
	if(this.image.height - sy < sHeight){
		sHeight = this.image.height - sy; 
	}
	var dWidth = sWidth;
	var dHeight = sHeight;	
    context.drawImage(this.image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);			
}
game.map = new Mapping(map1);
game.map.draw(ctx, camera.x, camera.y);

//camera-ing
let keys = {};
$(document).keypress(function(e){
    keys[e.key] = true;
});
$(document).keyup(function(e){
    keys[e.key] = false;
});
setInterval(function(){
    if (keys.a && camera.x - 5 >= 0){
        camera.x -= 5;
    }
    if (keys.d && camera.x + 5 <= c.width - rectSize * 32){
        camera.x += 5;
    }
    if (keys.w && camera.y - 5 >= 0){
        camera.y -= 5;
    }
    if (keys.s && camera.y + 5 <= c.height - rectSize * 32){
        camera.y += 5;
    }
    game.map.draw(ctx, camera.x, camera.y);
}, 100);





















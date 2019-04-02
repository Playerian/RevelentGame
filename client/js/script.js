//shit

// JavaScript File
/*global io $ navigator Image*/
const debugging = true;
const isMobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))

//socket init
var socket = io.connect(window.location.href);
$('#enter').on('click', function(evt){
    let value = $('#input').val();
    //emit username
    socket.emit('requestGame', {username: value});
});
//debugging tool
socket.on('print', function(data){
    console.log(data);
});
//socket event
socket.on('registered', function(){
    $('#waiting').show();
    $("#start").hide();
    socket.on('game', function(game, user){
        initGame(socket, game);
    });
});
if (debugging){
    socket.on('game', function(game, user){
        initGame(socket, game, user);
        $('#waiting').hide();
        $("#start").hide();
        //set render
        socket.on('render', function(data){
            //data
            game.data = data;
            //render board
            game.board = data.board;
            //update this player
            Object.assign(game.you, data.player);
            //remove tooltips and stuff
            startRender();
            camera.locked = false;
            selecting = false;
            hideHintBar();
        });
        game.socket.once('reset', function(){
            //remove tooltips and stuff
            startRender();
            camera.locked = false;
            selecting = false;
            hideHintBar();
        });
    });
}
//canvas init
var c = document.getElementById("canvas");
var $canvas = $('#canvasDiv');
var ctx = c.getContext("2d");
//camera init
function newCam(){
    this.game = undefined;
    this.locked = false;
    this.x = 0;
    this.y = 0;
    this.shiftTo = function(x, y, callback){
        if (x > this.game.rectSize * 32){
            x = this.game.rectSize * 32;
        }
        if (x < 0){
            x = 0;
        }
        if (y > this.game.rectSize * 32){
            y = this.game.rectSize * 32;
        }
        if (y < 0){
            y = 0;
        }
        this.locked = true;
        const frames = 50;
        //move in 1 second
        let xpixel = (x - this.x) / frames;
        let ypixel = (y - this.y) / frames;
        let times = 0;
        var interval = setInterval(function(){
            camera.x += xpixel;
            camera.y += ypixel;
            times ++;
            //rendering map
            if (rendering){
                camera.game.mapping.drawBG(camera.x, camera.y);
                camera.game.mapping.drawUnits();
                camera.game.mapping.drawFog();
            }
            //exit
            if (times === frames){
                camera.locked = false;
                clearInterval(interval);
                if (typeof callback === 'function'){
                    callback();
                }
            }
        }, 25);
    }
}
//utility var
var camera = new newCam();
let lockKeys = false;
var rectSize = 15;
let selecting = false;
let tooltipAppear = false;

//set canvas 
$('#canvasDiv').css('width', (rectSize * 32) + 'px');
$('#canvasDiv').css('height', (rectSize * 32) + 'px');

//utility
function setToolTip(unit){
    let $toolTip = $('#toolTips');
    let $descri = $('.description');
    $descri.hide();
    $toolTip.find('#name').text(unit.name);
    $toolTip.find('#class').text(unit.type);
    //attributes
    $toolTip.find('#hp').text(`hp: ${unit.hp}`);
    $toolTip.find('#spd').text(`spd: ${unit.spd}`);
    $toolTip.find('#mbi').text(`mbi: ${unit.mbi}`);
    $toolTip.find('#atk').text(`atk: ${unit.atk}`);
    $toolTip.find('#def').text(`def: ${unit.def}`);
    $toolTip.find('#mdf').text(`mdf: ${unit.mdf}`);
    //inventory
    let $inv = $toolTip.find('#inventory');
    $inv.empty();
    let $extra = $toolTip.find('#extra');
    $extra.empty();
    let inv = unit.inventory;
    inv.space.forEach((v, i)=>{
        let item = v;
        console.log(item);
        let $item = $('<div>').addClass('item');
        $inv.append($item);
        let $image = $('<img>').addClass('icon').attr('src', item.image);
        $item.append($image);
        let $itemName = $('<div>').addClass('itemName').text(item.name);
        $item.append($itemName);
        $item.click(function(event){
            $descri.show();
            $descri.find('.itemName').text(item.name);
            $descri.find('.goldNumber').text(item.cost);
            $descri.find('.descri').text(item.descri);
            //move it to mouse
            let mousex = event.pageX;
            let mousey = event.pageY;
            $descri.offset({left: mousex + 5, top: mousey + 5});
        });
    });
    inv.extra.forEach((v, i)=>{
        let item = v;
        let $item = $('<div>').addClass('item');
        $extra.append($item);
        let $image = $('<img>').addClass('icon').attr('src', item.image);
        $item.append($image);
        console.log(item.image);
        let $itemName = $('<div>').addClass('itemName').text(item.name);
        $item.append($itemName);
        $item.hover(function(){
            $(".description").show();
        }, function(){
            $(".description").hide();
        });
    });
    return $toolTip
}

function hideToolTip(){
    $('#toolTips').hide();
    tooltipAppear = false;
}

function setHintBar(x, y, text, size, color, width, time){
    let $bar = $("#hintBar");
    $('#hintText').text(text);
    $bar.css('visibility', 'visible');
    $bar.css('left', x);
    $bar.css('top', y);
    $bar.show().css('font-size', size + 'px');
    $bar.height($('#hintText').height());
    $('#hintMid').height($('#hintText').height());
    $("#hintLeft, #hintRight").css('border-top', `${$bar.height() / 2}px solid transparent`).css('border-bottom', `${$bar.height() / 2}px solid transparent`);
    $("#hintLeft").css('border-right', `${$bar.height() / 2 * Math.sqrt(3)}px solid ${color}`);
    $("#hintRight").css('border-left', `${$bar.height() / 2 * Math.sqrt(3)}px solid ${color}`);
    $('#hintMid').css('background', color).css('width', `${width}px`);
    if (time && typeof time === 'number'){
        setTimeout(() =>{
            $bar.hide();
        }, time)
    }
    return $bar;
}

function hideHintBar(){
    $('#hintBar').hide();
}

function renderGold(coin){
    $('#currentGold').text(coin);
}

let rendering = true;

function stopRender(){
    rendering = false;
}

function startRender(){
    rendering = true;
}

//including sprites
var $wall = $('<img>').attr('src', 'img/tiles/wall.png')[0];
var $road = $('<img>').attr('src', 'img/tiles/road.png')[0];
var $tower = $('<img>').attr('src', 'img/units/tower.png')[0];
var $nexus = $('<img>').attr('src', 'img/units/nexus.png')[0];

//game stuff
function initGame(socket, game, user){
    //initing
    camera.game = game;
    $('#mainGame').show();
    $('#waiting').hide();
    game.ctx = ctx;
    game.socket = socket;
    if (game.p1.name === user.name){
        game.you = game.p1;
    }else{
        game.you = game.p2;
    }
    window.game = game;
    console.log(game);
    //print gold
    $('#currentGold').text(user.coin);
    //map class def
    function Mapping(map){
        //initial loading
        map.forEach(function(v, i){
            v.forEach(function(v2, i2){
                if (v2 === 'r' || v2 === 'n' || v2 === 't'){
                    ctx.drawImage($road, i2 * 32, i * 32);
                }else if (v2 === 'w'){
                    ctx.drawImage($wall, i2 * 32, i * 32);
                }
            });
        });
        this.image = new Image();
    	this.image.src = ctx.canvas.toDataURL("image/png");
    	ctx.clearRect(0,0,c.width, c.height)
    	//methods
    	this.drawBG = function(x, y){
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
            ctx.drawImage(this.image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);			
    	};
        this.renderable = function(x, y){
            var checkPoint = 0;
            if (x - camera.x >= -32){
                checkPoint ++;
            }
            if (x - camera.x <= rectSize * 32){
                checkPoint ++;
            }
            if (y - camera.y >= -32){
                checkPoint ++;
            }
            if (y - camera.y <= rectSize * 32){
                checkPoint ++;
            }
            if (checkPoint === 4){
                return true;
            }
        }
        this.drawUnits = function(){
            //getting all units
            let f = this.renderable;
            let list = game.board.unitLists;
            list.forEach(function(v, i){
                //v here is not pixel but is index
                let unit = v;
                if (f(unit.x * 32, unit.y * 32)){
                    //draw 'em
                    let image = new Image();
                    image.src = unit.sprite;
                	var dWidth = image.width;
        	        var dHeight = image.height;	
        	        var sWidth = dWidth;
        	        var sHeight = dHeight;
        	        if (sWidth + unit.x * 32 - camera.x > rectSize * 32){
        	            sWidth = (rectSize * 32 - (unit.x * 32 - camera.x));
        	        }
        	        if (sHeight + unit.y * 32 - camera.y > rectSize * 32){
        	            sHeight = (rectSize * 32 - (unit.y * 32 - camera.y));
        	        }
        	        dWidth = sWidth;
        	        dHeight = sHeight;
                    ctx.drawImage(image, 0, 0, sWidth, sHeight, unit.x * 32 - camera.x, unit.y * 32 - camera.y, dWidth, dHeight);
                };
            });
        }
        this.drawFog = function(){
            //draw fog
            let tiles = game.board.tiles;
            ctx.globalAlpha = 0.5;
            let topLeft = [Math.floor(camera.x / 32), Math.floor(camera.y / 32)];
            //loop 15 tiles
            for (let i = topLeft[0]; i <= topLeft[0] + rectSize; i ++){
                for (let i2 = topLeft[1]; i2 <= topLeft[1] + rectSize; i2 ++){
                    if (!tiles[i]){
                        break;
                    }
                    if (!tiles[i][i2]){
                        break;
                    }
                    if (tiles[i][i2].fog === false){
                        continue;
                    }
                    //render
                    this.drawRect(i, i2, 'black');
                }
            }
            ctx.globalAlpha = 1;
        };
        this.drawRect = function(i, i2, color){
            ctx.fillStyle = color;
            let x, y, width, height;
            x = i;
            y = i2;
            width = 32;
            height = 32;
            if (x === 16){
                console.log();
            }
            if (width + x * 32 - camera.x > rectSize * 32){
	            width = (rectSize * 32 - (x * 32 - camera.x));
	        }
	        if (height + y * 32 - camera.y > rectSize * 32){
	            height = (rectSize * 32 - (y * 32 - camera.y));
	        }
            ctx.fillRect(x * 32 - camera.x, y * 32 - camera.y, width, height);
        };
    }
    let map = game.map;
    console.log(map);
    game.mapping = new Mapping(game.map);
    //handy methods
    //onclick
    let handlerList = [];
    function Handler(x, y, f){
        this.x = x;
        this.y = y;
        this.f = f;
    }
    game.tileonclick = function(x, y, f){
        handlerList.push(new Handler(x, y, f));
    }
    
    //camera-ing
    let keys = {};
    $(document).keypress(function(e){
        keys[e.key] = true;
    });
    $(document).keyup(function(e){
        keys[e.key] = false;
    });
    //on canvas right (no mobile)
    $('#canvasDiv, #toolTips').on('contextmenu', function(e){
        //prevent context menu
        e.preventDefault();
        //hide tool tip when available
        if (tooltipAppear){
            $('#toolTips').hide();
            tooltipAppear = false;
        }
        if (selecting){
            selecting = false;
            $('#hintBar').hide();
            camera.locked = false;
            startRender();
        }
    });
    //key-ing
    //on canvas left
    $canvas.on(isMobile ? 'touchend' : 'click', function(evt){
        // check for mouse click
        var x = evt.pageX - $canvas.offset().left;
        var y = evt.pageY - $canvas.offset().top;
        console.log("X coords: " + x + ", Y coords: " + y);
        //hiding stuff
        let $toolTips = $('#toolTips');
        $toolTips.css('visibility', 'visible');
        $toolTips.hide();
        //check if in canvas
        if (x >= 0 && y >= 0 && x <= rectSize * 32 && y <= rectSize * 32){
            let xIndex = Math.floor((x + camera.x) / 32);
            let yIndex = Math.floor((y + camera.y) / 32);
            //if selecting something
            if (selecting){
                //loop through available points
                for (let i = 0; i < handlerList.length; i ++){
                    let handler = handlerList[i];
                    if (xIndex === handler.x && yIndex === handler.y){
                        //yes the point!
                        if (typeof handler.f === 'function'){
                            handler.f();
                        }
                        //empty the handler
                        handlerList = [];
                        return;
                    }
                }
            }
            //check unit and render unit tooltip
            let tile = game.board.tiles[xIndex][yIndex];
            if (tile.units.length > 0){
                tile.units.forEach((v, i) => {
                    $toolTips.show();
                    setToolTip(v);
                    $toolTips.offset({top: y, left: x});
                    tooltipAppear = true;
                });
            }
        }
    });
    //interval
    setInterval(function(){
        //utility
        function common(){
            hideToolTip();
        }
        //render coin
        renderGold(game.you.coin)
        //disable moving of camera
        if (camera.locked){
            return;
        }else{
            //movement of camera
            if (keys.a && camera.x - 5 >= 0){
                camera.x -= 5;
                common();
            }
            if (keys.d && camera.x + 5 <= c.width - rectSize * 32){
                camera.x += 5;
                common();
            }
            if (keys.w && camera.y - 5 >= 0){
                camera.y -= 5;
                common();
            }
            if (keys.s && camera.y + 5 <= c.height - rectSize * 32){
                camera.y += 5;
                common();
            }
        }
        //rendering map
        //if disabled
        if (rendering){
            game.mapping.drawBG(camera.x, camera.y);
            game.mapping.drawUnits();
            game.mapping.drawFog();
        }
    }, 25);
    //move player according to p1 or p2
    if (game.you === game.p1){
        camera.shiftTo(0, rectSize * 32);
    }else{
        camera.shiftTo(rectSize * 32, 0);
    }
    //unit constructor
    function newUnitTile(image, name, cost, f){
        let $unitBlock = $('<div>').addClass('unitBlock');
        $unitBlock.attr('data-toggle', 'tooltip');
        $unitBlock.attr('title', 'Purchase?');
        let $img = $('<img>').attr('src', image)
        $unitBlock.append($img);
        let $unitName = $('<div>').text(name).addClass('unitName');
        $unitBlock.append($unitName);
        let $costDiv = $('<div>').addClass('costDiv');
        let $cost = $('<div>').append(cost);
        $costDiv.append($cost);
        $costDiv.append($('<img>').attr('src', '/img/misc/money.png'));
        $unitBlock.append($costDiv);
        $unitBlock.click(function(){
            $(this).tooltip("hide");
            if (typeof f === 'function'){ 
                f();
            }
        });
        return $unitBlock;
    }
    //button of the unitlist
    $('#unitButton').click(function(){
        $('#tableContent').empty();
    });
    //button of the shoplist
    $('#shopButton').click(function(){
        //empty the thing
        $('#tableContent').empty();
        let $menu = $('<div>').addClass('shopMenu');
        $('#tableContent').append($menu);
        $menu.append($("<div>").text('Purchase Units').addClass('menuTitle'))
        $menu.append(newUnitTile('img/units/baseUnit.png', 'base unit', 100, function(){
            window.scrollTo(0,0);
            //then callback
            if (game.you === game.p1){
                camera.shiftTo(0, rectSize * 32, callback);
            }else{
                camera.shiftTo(rectSize * 32, 0, callback);
            }
            //make it look synchronous
            function callback(){
                stopRender();
                camera.locked = true;
                selecting = true;
                //let player choose tile
                let hintBar = setHintBar(rectSize * 32 / 6 - 55, 100, 'Choose the tile you want the unit to be in', 25, "#74a6f7", rectSize * 32 * 2 / 3);
                //select a tile plz
                let redTiles = game.you.spawn;
                redTiles.forEach(function(v, i){
                    //render
                    ctx.globalAlpha = 0.5;
                    game.mapping.drawRect(v[0], v[1], 'red');
                    ctx.globalAlpha = 1;
                    game.tileonclick(v[0], v[1], function(){
                        //emit request
                        game.socket.emit('newUnit', 'baseUnit', v[0], v[1]);
                    });
                });
            }
        }));
        //make tooltip alive
        $('.unitBlock').tooltip(); 
    });
    //button of the setting
    $('#settingButton').click(function(){
        $('#tableContent').empty();
    });
    //common
    $('.menuButtons').click(function(){
        hideToolTip();
    });
}




















var config = {
	type: Phaser.AUTO,
	//ifcamera works like shit again, it's because of these two lines below...
	width: Math.min(window.innerWidth, window.outerWidth),
    height: Math.min(window.innerHeight, window.outerHeight),
	physics: {
		default: 'arcade',
		arcade: {
			gravity: {y:0},
			debug: false
		}
	},
	scene: {
		preload: preload,
		create: create,
		update: update,
		extend: {
            minimap: null,
        }
	},
	audio:{
		disableWebAudio: true
	}
};

var game = new Phaser.Game(config);

var map;
var player;
var cursor;
var lastkey;
var text;
var coins;
var Totalcol;
var music;
var coinSound;
var enemySound;
var startbut;
var start = false;
var collected;
var enemy_time_till_spawn=20000;
var coin_last_spawn_time;
var enemy_last_spawn_time;
var maxcoins=10;
var maxenemies=5;
var currentenemies;
var enemies;
var grass;
var currentcoins;
var scene;

//loads assets.
function preload(){
	scene = this;
	this.load.tilemapTiledJSON('map','data/Map.json');//loads the map.
	this.load.image('tiles', 'images/map_tiles.png');//loads tiles.
	//this.load.image(COINS); //todo when adding coins.
	this.load.atlas('player','images/Character.png','data/Character.json');//todo when adding player character.
	//load audio file.
	this.load.audio('music','audio/Music.mp3');
	this.load.audio('coinSound','audio/Coin.wav');
	this.load.audio('enemySound','audio/Hit.wav');
	//adding coins.
	this.load.atlas('coin','images/Coin.png','data/Coin.json');
	//adding enemy.
	this.load.atlas('enemy','images/Enemy.png','data/Enemy.json');

}

//creates assets.
function create(){
	//variable init.
	collected = 0;
	currentenemies=0;
	currentcoins=0;
	coin_last_spawn_time = game.getTime();
	enemy_last_spawn_time=game.getTime();
	Totalcol = localStorage.getItem('highscore');
	if(Totalcol==null){
		Totalcol = 0;
	}
	//create coins.
	coins =this.physics.add.group();
	//create enemies.
	enemies=this.physics.add.group();

	//create map.
	map = this.make.tilemap({key:'map'});
	var TilesImg = map.addTilesetImage('map_tiles','tiles');
	grass = map.createDynamicLayer('grass',TilesImg,0,0);
	background = map.createDynamicLayer('background',TilesImg,0,0);
	collision = map.createDynamicLayer('collision', TilesImg,0,0).setVisible(false);
	collision.setCollisionByExclusion([-1]);
	//create minimap.

	this.minimap = this.cameras.add(window.innerWidth-300, 10, 210, 190).setZoom(0.15).setName('mini');
	this.minimap.setBounds(0,0,map.widthInPixels,map.heightInPixels);
	this.minimap.setAlpha(0.9);

	//update world bounds to map bounds.
	this.physics.world.bounds.width = background.width;
	this.physics.world.bounds.height = background.height;

	//create player.
	player = this.physics.add.sprite(map.widthInPixels/2, map.heightInPixels/2, 'player').setSize(15,13);
	player.setBounce(0.1);
	player.setCollideWorldBounds(true);
	player.body.setDrag(1000);

	//create animations for sprites.
	CreateAnimations();


	//player colliders.
	this.physics.add.collider(collision,player);
	this.physics.add.overlap(player,background);

	//create camera.
	this.cameras.main.setBounds(0,0,map.widthInPixels,map.heightInPixels);
	this.cameras.main.startFollow(player);
	cursors = this.input.keyboard.addKeys({
		'up': Phaser.Input.Keyboard.KeyCodes.W,
		'up1': Phaser.Input.Keyboard.KeyCodes.UP,
		'down': Phaser.Input.Keyboard.KeyCodes.S,
		'down1': Phaser.Input.Keyboard.KeyCodes.DOWN,
		'left':Phaser.Input.Keyboard.KeyCodes.A,
		'left1': Phaser.Input.Keyboard.KeyCodes.LEFT,
		'right': Phaser.Input.Keyboard.KeyCodes.D,
		'right1': Phaser.Input.Keyboard.KeyCodes.RIGHT
	});
	//cursors = this.input.keyboard.createCursorKeys();

	//create text.
	text = this.add.text(this.physics.world.bounds.width/2,16, '', {
		fontSize: '3em',
		fontFamily: 'fantasy',
		align: 'center',
		boundsAlignH: 'center',
		boundsAlignV: 'middle',
		fill: '#ffffff'
	});
	text.setOrigin(0.5);
	text.setScrollFactor(0);

	//add music and sounds.
	music = this.sound.add('music');
	music.setVolume(0.2);
	coinSound = this.sound.add('coinSound');
	coinSound.setVolume(0.3);
	enemySound = this.sound.add('enemySound');
	enemySound.setVolume(0.3);


	//add StartButton.
	startbut = this.add.text(window.innerWidth/2,window.innerHeight/2,"Click Here to Start!", {
		fontSize: '5em',
		fontFamily: 'fantasy',
		align: 'center',
		boundsAlignH: 'center',
		boundsAlignV: 'middle',
		fill: '#FF1236'
	});
	startbut.setInteractive({ useHandCursor: true })
	startbut.on('pointerdown', () => StartGame());
	startbut.setOrigin(0.5);
	startbut.setScrollFactor(0);
	this.minimap.ignore(text);
	this.minimap.ignore(startbut);
}

function update(){
	if(start){
		//update text for coin gathering.
		updateText();
		//character movement.
		CharacterControl();
		//play animation for coins spinning.
		coins.playAnimation('Coin_Anim',1);
		enemies.playAnimation('Enemy_Anim',1);
		spawnCoin();
		spawnEnemy();
		this.physics.collide(player,coins,collisionHandler);
		this.physics.collide(player,enemies,enemycollisionHandler);
	}
}

function timeexpired(c){
	if(c.active){
	currentcoins=currentcoins-1;
	collected = collected - 1;
	c.destroy();
	}
}

function collisionHandler(player,coin){
	coin.destroy();
	currentcoins=currentcoins-1;
	coinSound.play();
	collected++;
}

function enemycollisionHandler(player,enemy){
	enemySound.play();
	start = false;
	if(collected>Totalcol){
		localStorage.setItem('highscore',collected);
		GameOver(true);
	}else{
		GameOver(false);
	}
}

function GameOver(high){
	var t = " ";
	if(high){
		t = "You have achieved a new Highscore!\n";
	}
	//Game over text
	var centerx = scene.cameras.main.width*0.5;
	var centery = scene.cameras.main.height*0.5;
	var gover = scene.add.text(centerx,centery-100, "GAME OVER\n"+t+"Points: " + collected+"!", {
		fontSize: '5em',
		fontFamily: 'fantasy',
		align: 'center',
		boundsAlignH: 'center',
		boundsAlignV: 'middle',
		fill: '#0E0E0C'
	});
	gover.setOrigin(0.5);
	gover.setScrollFactor(0)
	//Restart button.
	var resbut = scene.add.text(centerx,centery+100,"Click Here to Restart!", {
		fontSize: '5em',
		fontFamily: 'fantasy',
		align: 'center',
		boundsAlignH: 'center',
		boundsAlignV: 'middle',
		fill: '#0E0E0C'
	});
	resbut.setInteractive({ useHandCursor: true })
	resbut.on('pointerdown', () => RestartGame());
	resbut.setOrigin(0.5);
	resbut.setScrollFactor(0);
	player.destroy();
	coins.clear(true);
	enemies.clear(true);
	text.destroy();
	scene.cameras.main.setBackgroundColor(0x951515);
	map.removeLayer(collision);
	map.destroy();
	scene.minimap.ignore(resbut);
	scene.minimap.ignore(gover);
}

function RestartGame(){
	scene.scene.restart();
}

function CreateAnimations(){
	scene.anims.create({ key: 'Walking_Left',
	frames: scene.anims.generateFrameNames('player', { prefix: 'Walking_Left-',suffix:'.png', start:0,end: 9 }),
	frameRate: 10,
	 repeat: -1 });
	scene.anims.create({ key: 'Walking_Right',
	 frames: scene.anims.generateFrameNames('player', { prefix: 'Walking_Right-',suffix:'.png', start:0,end: 9 }),
	 frameRate: 10,
		repeat: -1 });
	scene.anims.create({ key: 'Walking_Up',
		frames: scene.anims.generateFrameNames('player', { prefix: 'Walking_Up-',suffix:'.png', start:0,end: 9 }),
		frameRate: 10,
		 repeat: -1 });
	scene.anims.create({ key: 'Walking_Down',
		 frames: scene.anims.generateFrameNames('player', { prefix: 'Walking_Down-',suffix:'.png', start:0,end: 9 }),
		 frameRate: 10,
			repeat: -1 });
	scene.anims.create({ key: 'Idle_Down',
			frames: scene.anims.generateFrameNames('player', { prefix: 'Idle_Front-',suffix:'.png', start:0,end: 2 }),
			frameRate: 1,
			 repeat: -1 });
	scene.anims.create({ key: 'Idle_Left',
			frames: scene.anims.generateFrameNames('player', { prefix: 'Idle_Left-',suffix:'.png', start:0,end: 2 }),
			frameRate: 1,
			 repeat: -1 });
	scene.anims.create({ key: 'Idle_Right',
			frames: scene.anims.generateFrameNames('player', { prefix: 'Idle_Right-',suffix:'.png', start:0,end: 2 }),
			frameRate: 1,
			 repeat: -1 });
	scene.anims.create({ key: 'Idle_Top',
			frames: scene.anims.generateFrameNames('player', { prefix: 'Idle_Top-',suffix:'.png', start:0,end: 0 }),
			frameRate: 1,
			 repeat: -1 });
	scene.anims.create({ key: 'Coin_Anim',
				frames: scene.anims.generateFrameNames('coin', { prefix: 'Coin',suffix:'.png', start:0,end: 6 }),
				frameRate: 3,
				 repeat: -1 });
	scene.anims.create({ key: 'Enemy_Anim',
			 				frames: scene.anims.generateFrameNames('enemy', { prefix: 'frame',suffix:'.png', start:0,end: 15 }),
			 				frameRate: 8,
			 				 repeat: -1 });

}

function updateText (){
	text.setPosition(game.canvas.width/2 / map.scene.cameras.main.zoom, text.height);
    text.setText(
        'Coins collected: ' + collected + '    Best result: ' + Totalcol
    );
    text.setColor('white');
}

function CharacterControl(){
	if(game.input.mousePointer.isDown){
		scene.physics.moveTo(player,game.input.mousePointer.worldX,game.input.mousePointer.worldY,200);
		var deg =player.body.velocity;
		if(Math.abs(deg.x)>Math.abs(deg.y)){
			if(deg.x>0){
				lastkey="Right";
				player.anims.play('Walking_Right', true);
			}
			else{
				lastkey="Left";
				player.anims.play('Walking_Left', true);
			}

		}
		else{
			if(deg.y>0){
				lastkey="Down";
				player.anims.play('Walking_Down', true);
			}
			else{
				lastkey="Up";
				player.anims.play('Walking_Up', true);
			}

		}
	}
	else{
    if (cursors.left.isDown||cursors.left1.isDown) // if the left arrow key is down
    {
		//player.x-=4; // move left
		player.body.setVelocityX(-200);
		player.anims.play('Walking_Left', true);
		lastkey="Left";
		var deg =player.body.velocity;
    }
    else if (cursors.right.isDown||cursors.right1.isDown) // if the right arrow key is down
    {
		//player.x+=4; // move right
		player.body.setVelocityX(+200);
		player.anims.play('Walking_Right', true);
		lastkey="Right";
		var deg =player.body.velocity;
    }
    else if (cursors.up.isDown||cursors.up1.isDown )
    {
		player.body.setVelocityY(-200);
		player.anims.play('Walking_Up', true);
		lastkey="Up";
		var deg =player.body.velocity;
    }
	else if(cursors.down.isDown||cursors.down1.isDown)
    {
		player.body.setVelocityY(+200);
		player.anims.play('Walking_Down', true);
		lastkey="Down";
		var deg =player.body.velocity;
    }
	else{
		if(lastkey=="Down"){
			player.anims.play('Idle_Down', true);
		}
		else if (lastkey =="Up"){
			player.anims.play('Idle_Top', true);
		}
		else if (lastkey =="Left"){
			player.anims.play('Idle_Left', true);
		}
		else if (lastkey =="Right"){
			player.anims.play('Idle_Right', true);
		}
	}
}

}

function spawnCoin(){
	var current_time = game.getTime();
	var	coin_time_til_spawn = Phaser.Math.Between(2000,3000);
	if(current_time - coin_last_spawn_time > coin_time_til_spawn){
		coin_last_spawn_time = current_time;

		var positionx = Phaser.Math.Between(0,map.widthInPixels);
		var positiony = Phaser.Math.Between(0, map.heightInPixels);
		if (!collision.getTileAtWorldXY(positionx,positiony)&& currentcoins<maxcoins) {
			var coin=coins.create(positionx,positiony,'coin');
			var timer =scene.time.addEvent({
			delay: 12000,
			callback: () => {
				timeexpired(coin)
			},
				loop: false
			})
			currentcoins=currentcoins+1;
		}
	}
}

function spawnEnemy(){
	var current_time = game.getTime();
	if(current_time - enemy_last_spawn_time > enemy_time_till_spawn){
		enemy_last_spawn_time = current_time;
		var positionx = Phaser.Math.Between(0,map.widthInPixels);
		var positiony = Phaser.Math.Between(0, map.heightInPixels);
		if (!collision.getTileAtWorldXY(positionx,positiony)&& currentenemies<maxenemies) {
			var enemy=enemies.create(positionx,positiony,'enemy').setSize(40,40);
			enemy.setBounce(1);
			enemy.setCollideWorldBounds(true);
			scene.physics.add.collider(collision,enemy);
			var direction = Phaser.Math.Between(1,4)
			if(direction==1){
				enemy.body.setVelocityX(-100);
				enemy.body.setVelocityY(-100);
			}else if(direciton=2){
				enemy.body.setVelocityY(-100);
				enemy.body.setVelocityX(100);
			}else if(direction=3){
				enemy.body.setVelocityX(100);
				enemy.body.setVelocityY(100);
			}else{
				enemy.body.setVelocityY(100);
				enemy.body.setVelocityX(-100);
			}
			currentenemies=currentenemies+1;
		}
	}
}

function StartGame(){
	music.play({loop: true});
	startbut.destroy();
	start = true;
}

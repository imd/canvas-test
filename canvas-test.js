var NUM_BALLS      =  5
var BALL_DIAMETER  = 16
var BALL_SPEED     =  2
var BALL_COLOR     = "#592f2d"
var BALL_SPRITE    = 'images/spinning-globe.png'
var GUN_LENGTH     = 44
var GUN_WIDTH      = 14
var GUN_COLOR      = "#9dacb2"
var GUN_SPRITE_H   = 'images/gun-horiz.png'
var GUN_SPRITE_V   = 'images/gun-vert.png'
var BARRIER_WIDTH  = GUN_WIDTH - 4
var TICK_LENGTH_MS = 10

var CTX;
var WIDTH;
var HEIGHT;
var MIN_X;
var MIN_Y;
var MAX_X;
var MAX_Y;
var BALLS = [];
var FILLED_AREAS = [];
var GUN;
var BARRIER;
var TICK = 0;

/**
 * Restrict b to the range [a, c].
 */
function restrict_range(n, a, b) {
    if (a > b) {
        throw 'restrict_range called with bad args: ' + n + ', ' + a + ', ' + b;
    }
    return (n < a ? a :
            n > b ? b :
            n);
}

function cartesian_to_polar(x, y) {
    return {magnitude: Math.sqrt(x*x + y*y),
            angle:     Math.atan2(y, x)};
}

function polar_to_cartesian(magnitude, angle) {
    return {x: magnitude * Math.cos(angle),
            y: magnitude * Math.sin(angle)};
}

function Ball(x, y, radius, speed, heading, color, img_src) {
    this.x = restrict_range(x, radius, WIDTH - radius);
    this.y = restrict_range(y, radius, HEIGHT - radius);
    this.radius = radius;
    this.speed = speed;
    this.heading = heading;
    this.color = color || "#000";
    if (img_src) {
        this.img = new Image();
        this.img.src = img_src;
        this.img.frame_size = this.radius * 2;
        this.img.num_frames = this.img.width / this.img.frame_size;
        this.img.frame = Math.floor(Math.random() * this.img.num_frames);
    }
    this.update_cartesian();
}

Ball.prototype.update_cartesian = function () {
    var cartesian = polar_to_cartesian(this.speed, this.heading);
    this.dx = cartesian.x;
    this.dy = cartesian.y;
};

Ball.prototype.update_polar = function () {
    var polar = cartesian_to_polar(this.dx, this.dy);
    this.speed = polar.magnitude;
    this.heading = polar.angle;
};

Ball.prototype.set_pos = function (x, y) {
    this.x = x;
    this.y = y;
};

Ball.prototype.handle_wall_collisions = function () {
    var x = this.x,
        y = this.y,
        radius = this.radius;

    if (x + radius > WIDTH || x - radius < 0)
        this.dx = -this.dx;
    if (y + radius > HEIGHT || y - radius < 0)
        this.dy = -this.dy;
};

Ball.prototype.handle_ball_collisions = function (other) {
    var dx, dy, radii;

    if (this == other)
        return;
    dist_x = other.x - this.x;
    dist_y = other.y - this.y;
    radii = this.radius + other.radius;
    // Compare the square of the distance with the square of the combined
    // radii.  If the former is <= the latter, balls intersect.
    if (dist_x * dist_x + dist_y * dist_y <= radii * radii) {
        // If ball is hitting the top or bottom of the other
        if (   this.x >= other.x - other.radius
            && this.x <= other.x + other.radius) {
            this.dx = -this.dx;
        }
        // If ball is hitting the side of the other
        if (   this.y >= other.y - other.radius
            && this.y <= other.y + other.radius) {
            this.dy = -this.dy;
        }
    }
};

Ball.prototype.move = function () {
    this.x += this.dx;
    this.y += this.dy;
};

Ball.prototype.draw = function () {
    if (!this.img) {
        CTX.fillStyle = this.color;
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, true);
        CTX.closePath();
        CTX.fill();
    } else {
        var img = this.img;

        CTX.drawImage(
            img,

            img.frame * img.frame_size,
            0,
            img.frame_size,
            img.frame_size,

            this.x - img.frame_size / 2,
            this.y - img.frame_size / 2,
            img.frame_size,
            img.frame_size);
        if (TICK % 10 == 0) {
            img.frame = (img.frame + 1) % img.num_frames;
        }
    }
};

function Gun(x, y, horizontal_p, color) {
    this.x = x;
    this.y = y;
    this.horizontal_p = horizontal_p;
    this.w = horizontal_p ? GUN_LENGTH : GUN_WIDTH;
    this.h = horizontal_p ? GUN_WIDTH : GUN_LENGTH;
    this.color = color || "#000";
    this.sprite_h = GUN_SPRITE_H;
    this.sprite_v = GUN_SPRITE_V;
    this.img = new Image();
}

Gun.prototype.draw = function () {
    if (!this.img) {
        CTX.fillStyle = this.color;
        CTX.beginPath();
        CTX.fillRect(this.x - (this.w / 2), this.y - (this.h / 2),
                     this.w, this.h);
        CTX.closePath();
        CTX.fill();
    } else {
        var img = this.img;

        img.src = (this.horizontal_p) ? this.sprite_h : this.sprite_v;
        CTX.drawImage(
            img,
            0, 0, img.width, img.height,
            this.x - (img.width / 2), this.y - (img.height / 2),
            img.width, img.height);
    }
};

/* Put gun under mouse */
function update_gun_pos(evt) {
  if (   evt.pageX > MIN_X && evt.pageX < MAX_X
      && evt.pageY > MIN_Y && evt.pageY < MAX_Y) {
      GUN.x = evt.pageX - MIN_X;
      GUN.y = evt.pageY - MIN_Y;
  }
}

/* Flip gun on space bar press */
function flip_gun(evt) {
    var tmp;
    if (evt.keyCode == 32) {
        GUN.horizontal_p = !GUN.horizontal_p;
        tmp = GUN.w;
        GUN.w = GUN.h;
        GUN.h = tmp;
    }
}

function Barrier(x, y, horizontal_p, speed, color) {
    this.x1 = x;
    this.x2 = x;
    this.y1 = y;
    this.y2 = y;
    this.horizontal_p = horizontal_p;
    this.speed = speed;
    this.color = color || "#ccc";
    if (horizontal_p) {
        this.y1 -= BARRIER_WIDTH / 2;
        this.y2 += BARRIER_WIDTH / 2;
    } else {
        this.x1 -= BARRIER_WIDTH / 2;
        this.x2 += BARRIER_WIDTH / 2;
    }
}

Barrier.prototype.save = function () {
    FILLED_AREAS.push(
        new FilledArea(this.x1, this.x2, this.y1, this.y2));
    BARRIER = undefined;
}

Barrier.prototype.move = function () {
    if (this.horizontal_p) {
        if (this.x1 <= 0 && this.x2 >= WIDTH) {
            this.save();
        } else {
            this.x1 -= this.speed;
            this.x2 += this.speed;
        }
    } else {
        if (this.y1 <= 0 && this.y2 >= HEIGHT) {
            this.save();
        } else {
            this.y1 -= this.speed;
            this.y2 += this.speed;
        }
    }
};

Barrier.prototype.draw = function () {
    CTX.fillStyle = this.color;
    CTX.beginPath();
    CTX.fillRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
    CTX.closePath();
    CTX.fill();
};

function create_barrier(evt) {
  if (   evt.pageX > MIN_X && evt.pageX < MAX_X
      && evt.pageY > MIN_Y && evt.pageY < MAX_Y) {
      if (!BARRIER)
          BARRIER = new Barrier(evt.pageX - MIN_X, evt.pageY - MIN_Y,
                                GUN.horizontal_p, BALL_SPEED);
  }
}

function FilledArea(x1, x2, y1, y2, color) {
    this.x1 = x1;
    this.x2 = x2;
    this.y1 = y1;
    this.y2 = y2;
    this.color = color || "#000";
}

FilledArea.prototype.draw = function () {
    CTX.fillStyle = this.color;
    CTX.beginPath();
    CTX.fillRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
    CTX.closePath();
    CTX.fill();
};

function clear() {
    CTX.clearRect(0, 0, WIDTH, HEIGHT);
}

function draw() {
    var i, j;

    clear();
    for (i = 0; i < BALLS.length; i++) {
        ball1 = BALLS[i];
        ball1.move();
        ball1.handle_wall_collisions();
    }
    for (i = 0; i < BALLS.length; i++) {
        ball1 = BALLS[i];
        for (j = 0; j < BALLS.length; j++) {
            ball2 = BALLS[j];
            ball1.handle_ball_collisions(ball2);
        }
        ball1.draw();
    }
    GUN.draw();
    if (BARRIER) BARRIER.move();
    if (BARRIER) BARRIER.draw();
    for (i = 0; i < FILLED_AREAS.length; i++) {
        FILLED_AREAS[i].draw();
    }
    ++TICK;
}

/* Choose an element from an Array at random */
function random_elt(choices) {
    return choices[Math.floor(Math.random() * choices.length)];
}

function init() {
    var canvas = $("#canvas")[0],
        i;

    $(document).mousemove(update_gun_pos);
    $(document).mousedown(create_barrier);
    $(document).keydown(flip_gun);
    CTX = canvas.getContext("2d");
    WIDTH = canvas.width;
    HEIGHT = canvas.height;
    MIN_X = $("#canvas").offset().left;
    MIN_Y = $("#canvas").offset().top;
    MAX_X = MIN_X + WIDTH;
    MAX_Y = MIN_Y + WIDTH;
    for (i = 0; i < NUM_BALLS; i++) {
        BALLS.push(new Ball(
            Math.random() * WIDTH, Math.random() * HEIGHT, BALL_DIAMETER / 2,
            BALL_SPEED, 2 * Math.PI * Math.random(), BALL_COLOR, BALL_SPRITE));
    }
    GUN = new Gun(WIDTH / 2, HEIGHT / 2, true, GUN_COLOR);
    FILLED_AREAS =
        [new FilledArea(-10, 0, -10, HEIGHT + 10),
         new FilledArea(WIDTH, WIDTH + 10, -10, HEIGHT + 10),
         new FilledArea(WIDTH - 10, WIDTH + 10, -10, 0),
         new FilledArea(WIDTH - 10, WIDTH + 10, HEIGHT, HEIGHT + 10)];
    setInterval(FPS, 1000);
    return setInterval(draw, TICK_LENGTH_MS);
}

function FPS() {
    $('#tick').html(TICK + " FPS");
    TICK = 0;
}

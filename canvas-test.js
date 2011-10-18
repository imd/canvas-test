var CTX;
var WIDTH;
var HEIGHT;
var CIRCLES = [];
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

function Circle(x, y, radius, speed, heading) {
    this.x = restrict_range(x, radius, WIDTH - radius);
    this.y = restrict_range(y, radius, HEIGHT - radius);
    this.radius = radius;
    this.speed = speed;
    this.heading = heading;
    this.update_cartesian();
}

Circle.prototype.update_cartesian = function () {
    var cartesian = polar_to_cartesian(this.speed, this.heading);
    this.dx = cartesian.x;
    this.dy = cartesian.y;
};

Circle.prototype.update_polar = function () {
    var polar = cartesian_to_polar(this.dx, this.dy);
    this.speed = polar.magnitude;
    this.heading = polar.angle;
};

Circle.prototype.set_pos = function (x, y) {
    this.x = x;
    this.y = y;
};

Circle.prototype.move = function (dx, dy) {
    var x = this.x,
        y = this.y,
        radius = this.radius;

    if (x + radius + dx > WIDTH || x - radius + dx < 0) {
        this.dx = -dx;
    }
    if (y + radius + dy > HEIGHT || y - radius + dy < 0) {
        this.dy = -dy;
    }
    this.x += dx;
    this.y += dy;
};

Circle.prototype.move_normally = function () {
    this.move(this.dx, this.dy);
};

Circle.prototype.randomize_motion = function () {
    this.update_polar();
    this.speed += Math.random() - 0.5;
    this.heading += 2*Math.PI*Math.random() - Math.PI;
    this.update_cartesian();
};

Circle.prototype.draw = function () {
    CTX.beginPath();
    CTX.arc(this.x, this.y, this.radius, 0, 2*Math.PI, true);
    CTX.closePath();
    CTX.fill();
};

function clear() {
    CTX.clearRect(0, 0, WIDTH, HEIGHT);
}

function draw() {
    clear();
    CIRCLES.forEach(function (circle) {
        if (TICK % 1000 === 0) {
            circle.randomize_motion();
        }
        if (Math.random() * 100 < 0.035) { //0.035% chance of teleporting
            circle.set_pos(Math.random() * WIDTH, Math.random() * HEIGHT);
        }
        circle.move_normally();
        circle.draw();
    });
    $('#tick').html(TICK);
    ++TICK;
}

function init() {
    var canvas = $("#canvas")[0],
        i;
    CTX = canvas.getContext("2d");
    WIDTH = canvas.width;
    HEIGHT = canvas.height;

    for (i = 0; i < 5; i++) {
        CIRCLES.push(new Circle(Math.random() * WIDTH,
                                Math.random() * HEIGHT,
                                10,
                                1 + Math.random(),
                                2*Math.PI*Math.random() - Math.PI));
    }
    return setInterval(draw, 10);
}

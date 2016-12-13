var token = process.env.TOKEN;

var Bot = require('node-telegram-bot-api');
var bot;

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'classicmodels'
});

if(process.env.NODE_ENV === 'production') {
  bot = new Bot(token);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
}
else {
  bot = new Bot(token, { polling: true });
}

console.log('Bot server started in the ' + process.env.NODE_ENV + ' mode');

bot.onText(/[\/]start/, function (msg) {
  bot.sendMessage(msg.chat.id, 'HoboDiecast Hobby Shop\n============================================\n' +
                               'This is telegram bot for HoboDiecast Online Shop.\n\n' +
                               'Available commands: \n' +
                               '/search - search available products. Ex: /searchharley\n' +
                               '/listCategory - list available product category\n' +
                               '/newCart - create new cart (will erase current cart)\n' +
                               '/viewCart - view current cart\n').then(function () {
    // reply sent!
  });
})

bot.onText(/[\/]newCart/, function (msg) {
  connection.query('select orderNumber from orders order by orderNumber desc limit 1', function (err, rows, fields) {

    if (err) throw err;
    var newNumber = rows[0].orderNumber + 1;

    connection.query('select customerNumber from customers where customerName = "'+msg.from.first_name+'"', function (err, rows, fields) {

      if (err) throw err;
      var custNumber = rows[0].customerNumber;
      var date = new Date();
      var today = date.getYear() + "-" + date.getMonth() + "-" + date.getDate();

      connection.query('insert into orders (orderNumber, orderDate, customerNumber) values('+ newNumber +', '+ today +', '+ custNumber +')', function (err, result) {

        if (err) throw err;
        bot.sendMessage(msg.chat.id, 'Order '+ newNumber +' has been created').then(function () {
          // reply sent!
        });

      });
    });
  });
})

bot.onText(/[\/]addToCart/, function (msg) {
  connection.query('select customerNumber from customers where customerName = "'+msg.from.first_name+'"', function (err, rows, fields) {

    if (err) throw err;
    var custNumber = rows[0].customerNumber;

    connection.query('SELECT orderNumber, customerNumber FROM orders WHERE customerNumber = "'+custNumber+'" order by orderNumber desc limit 1', function (err, rows, fields) {

      if (err) throw err;
      var orderNumber = rows[0].orderNumber;

      connection.query('SELECT productCode, buyPrice from products where productCode = "'+msg.text.substr(10)+'"', function (err, rows, fields) {

        if (err) throw err;

        var productCode = rows[0].productCode;
        var price = rows[0].buyPrice + (rows[0].buyPrice*0.2);

        connection.query('INSERT INTO orderdetails (orderNumber, productCode, quantityOrdered, priceEach) values ('+orderNumber+', "'+productCode+'", 1, '+price+')', function (err, result) {

          if (err) throw err;

          bot.sendMessage(msg.chat.id, productCode + ' has been added to ' + orderNumber).then(function () {
            // reply sent!
          });
        });
      });
    });
  });
});

bot.onText(/[\/]viewCart/, function (msg) {
  var cart = "";
  connection.query('select orderNumber from orders order by orderNumber desc limit 1', function (err, rows, fields) {

    if (err) throw err;
    var orderNumber = rows[0].orderNumber;

    connection.query('SELECT sum(priceEach) as total from orderdetails where orderNumber = '+orderNumber+'', function (err, rows, fields) {

      if (err) throw err;
      var total = rows[0].total;

      connection.query('SELECT a.orderNumber, a.productCode, a.quantityOrdered, a.priceEach, b.productName FROM `orderdetails` as a join `products` as b on a.productCode = b.productCode WHERE `orderNumber` = '+orderNumber+'', function (err, rows, fields) {

        if (err) throw err;

        for (var i = 0; i < rows.length; i++) {
          cart = cart +
            "Product Code: " + rows[i].productCode + "\n" +
            "Product Name: " + rows[i].productName + "\n" +
            "Amount: " + rows[i].quantityOrdered + "\n" +
            "Price Each: " + rows[i].priceEach + "\n\n";
        }

        bot.sendMessage(msg.chat.id, 'Cart - ' +orderNumber+ '\n===================================\n' +cart+ 'Total Price: ' +total+ '\n\n/checkout').then(function () {
          // reply sent!
        });
      });
    });
  });
});

bot.onText(/[\/]checkout/, function (msg) {
  connection.query('select orderNumber from orders order by orderNumber desc limit 1', function (err, rows, fields) {

    if (err) throw err;
    var oldNumber = rows[0].orderNumber;
    var newNumber = rows[0].orderNumber + 1;

    connection.query('select customerNumber from customers where customerName = "'+msg.from.first_name+'"', function (err, rows, fields) {

      if (err) throw err;
      var custNumber = rows[0].customerNumber;
      var date = new Date();
      var today = date.getYear() + "-" + date.getMonth() + "-" + date.getDate();

      connection.query('insert into orders (orderNumber, orderDate, customerNumber) values('+ newNumber +', '+ today +', '+ custNumber +')', function (err, result) {

        if (err) throw err;
        bot.sendMessage(msg.chat.id, 'Order-' +oldNumber+ ' has been processed.\nPlease commit payment manually via available ATM listed below\n\nBCA - 123458913749818 by Yabes Wirawan\nMandiri - 12093809513890518309 by Yabes Wirawan\nCIMB - 90183908109410983 by Yabes Wirawan\n\nPlease pay exactly the same amount with the total price.\n\nCart-'+newNumber+' has been established').then(function () {
          // reply sent!
        });

      });
    });
  });
})

bot.onText(/[\/]search/, function (msg) {

  var productSpecification = "";

  connection.query('SELECT productCode, productName, '+
                   ' productLine, productScale, productDescription, buyPrice '+
                   ' from products where productName like "%'+ msg.text.substr(7) +'%" or '+
                   ' productLine like "%'+ msg.text.substr(7) +'%"', function(err, rows, fields) {
    if (err) throw err;

    // console.log(rows);

    for (var i = 0; i < rows.length; i++) {
      productSpecification =
        "ID: " + rows[i].productCode + "\n" +
        "Name: " + rows[i].productName + "\n" +
        "Category: " + rows[i].productLine + "\n" +
        "Scale: " + rows[i].productScale + "\n" +
        "Price: " + rows[i].buyPrice + "\n\n" +
        "Description: \n" + rows[i].productDescription + "\n\n/addToCart" + rows[i].productCode;
        bot.sendMessage(msg.chat.id, 'HoboDiecast Products\n======================================================\n' + productSpecification).then(function () {
          // reply sent!
        });
    }
  });
});

bot.onText(/[\/]listCategory/, function (msg) {
  var productCategory = "";

  connection.query('SELECT productLine, textDescription from productlines', function (err, rows, fields) {
    if (err) throw err;

    // console.log(rows);

    for (var i = 0; i < rows.length; i++) {
      productCategory = productCategory + "/search" + rows[i].productLine + "\n";
    }
    bot.sendMessage(msg.chat.id, 'HoboDiecast Product Categories\n======================================================\n' + productCategory).then(function () {
      // reply sent!
    });
  });
});

module.exports = bot;

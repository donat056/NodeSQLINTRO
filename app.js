'use strict';

var io = require('socket.io');
var mysql = require('mysql'),
    http = require('http'),
    fs = require('fs');
var pageContent=
    fs.readFileSync('webpage.html',"utf8");
var connection = mysql.createConnection({
    host: '50.83.244.38',
    port: 1338,
    user: 'playerone',
    password: 'readysteadygo',
    database: 'Donatucci'
});

var clickArray =[];
var total = 0;
var employee = "";
io.listen(8000).on('connection', function (socket) {
    checkDeal()
    function webupdate(id){
        var countQuery = 'select Register.label, amount, buttons.buttonIndex from Register INNER JOIN buttons USING (label)'
        var i = 0;
        var count = 0;

        connection.query(countQuery, function(err, rows, fields) {
            if (err) throw err;
            while (rows[i] != undefined) {
                clickArray[rows[i].buttonIndex] = rows[i].amount;
                i++;

            }
            if (id != null) {
                var itemName = 'select label from buttons where buttonIndex = ' + id.id;
                if(clickArray[id.id] == null) {
                    clickArray[id.id] = 0;
                    clickArray[id.id]++;
                    var toQuery = 'insert into Register (label,amount,time_stamp, user) values (('+ itemName + ')' +',' + 1 + ',' + '(Select NOW()), ("' + employee + '"))'
                    var query = connection.query(toQuery);
                    var toUpdate = 'update Register set price = (select price from Inventory where Inventory.itemName = Register.label), itemID = (select id from Inventory where Inventory.itemName = Register.label)';
                    var updateQuery = connection.query(toUpdate);
                } else {
                    clickArray[id.id]++;
                    var toUpdateAmount = 'update Register set time_stamp=(Select NOW()), amount=' + clickArray[id.id] + ' where Register.label =(' + itemName + ')';
                    var updateAmountQuery = connection.query(toUpdateAmount);
                }

                socket.emit('updateList', clickArray, id);

                console.log(clickArray);
                checkDeal();
                updateAmount();

            } else {
                var j = 0;
                while (rows[j] != undefined) {
                    for (var k = 0; k < rows[j].amount; k++) {
                        socket.emit('updateList', clickArray, {id:rows[j].buttonIndex});
                    }
                    j++;
                }
                checkDeal();
                updateAmount();
            }

        });

    }

    function updateAmount() {
        total = 0;
        var priceQuery = 'select price, amount from Register';
        connection.query(priceQuery, function(err, rows, fields) {
            var i = 0;
            if (err) throw err;
            while (rows[i] != undefined) {
                total += (rows[i].price * rows[i].amount);
                i++;
            }
            socket.emit('updatePrice', total);
            console.log(total);
        });
    }
    socket.emit('refresh');
    webupdate(null);



    socket.on('refreshAll', function() {
        webupdate(null)
    });

    socket.on('updateClickArray', function (id, employeeName) {
        employee = employeeName;
        webupdate(id);
    });

    socket.on('deleteItem', function (selected, item) {

        if(clickArray[selected] == 1) {
            clickArray[selected] = null;
            var toDelete = "delete from Register where label= '" + item + "'";
            var delQuery = connection.query(toDelete);
            console.log('1')
        } else {
            clickArray[selected]--;
            var toDelAmount = 'update Register set time_stamp=(Select NOW()), amount=' + clickArray[selected] + " where Register.label ='" + item+ "'";
            var delAmountQuery = connection.query(toDelAmount);
            console.log('not 1')
        }
        checkDeal();
        socket.emit('refresh');

    });

    socket.on('pay', function (creditType, employee) {
        var completeQuery = "call COMPLETE_TRANSACTION('" + employee + "','" + creditType + "')";
        connection.query(completeQuery);

    });

    function checkDeal() {
        var deleteQuery = 'delete from Register where price ' + '\<=' + '0';
        connection.query(deleteQuery);
        var checkQuery = "call CHECK_DEAL()";
        connection.query(checkQuery);
    }

});


http.createServer(handleRequest).listen(8080);

function handleRequest(req, res) {

    function getButtonsFromDB(callback) {
        var query;
        var divString='';
        query = connection.query('select html from buttons');
        query.on('error', function(err) {
            console.log("A database error occurred:");
            console.log(err);
        });

        query.on('result', function(result){
            divString += result.html;
            divString += result.html;
            divString += '\n';
        });

        query.on('end', function(result){

            callback(divString);
            //connection.end();
        })
    }
    getButtonsFromDB(function(contents){
        res.writeHead(200,{'Content-Type': 'text/html'});
        res.write(pageContent.replace('DBBUTTONS',contents));
        res.end();
    });
}


//var toQuery = 'insert into Register (label,amount,time_stamp) values ((select label from buttons where buttonIndex = ' + id.id + ')' + ',' + 1 + ',' + '(Select NOW())' + ')';
//var query = connection.query(toQuery);
//var toUpdate = 'update Register set price = (select price from Inventory where Inventory.itemName = Register.label)';
//var updateQuery = connection.query(toUpdate);
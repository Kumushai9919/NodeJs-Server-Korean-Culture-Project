var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectId;
var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');
const { response } = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

var str = "str12312";


var dict = {};

var title = []; // title 
var imgLink = []; // link images
var date = []; // date block
var link = []; // links
var categories = []; // categories
var blockLength = [];


function axiosFunc() {
  axios.get('https://www.chf.or.kr/chf').then((res) => {

        const $ = cheerio.load(res.data); 

        console.log('1')
        $('.event_img').find('div > a > span.tit').each(function (index, element) {
            title.push($(element).text());
        });

        $('.event_img').find('div > a > span.date').each(function (index, element) {
            date.push($(element).text());

        });

        $('.event_img').find('div > a > img').each(function (index, element) {
            imgLink.push($(element).attr('src'));
        });

        $('.event_img').each(function (index, element) {
            link.push($(element).find('a').attr('href'));
        });

        $('.event_tit').find('div > a').each(function (index, element) {
            categories.push($(element).text());
        });
        var count =0;
        $('.event_cont').find('div.event_slide').each(function (index, element) {
          $(element).find('div > div.event_img').each(function (index, element) {
              count++;
          });
          blockLength.push(count);
          count = 0;
      });


      for(var i = 0; i<categories.length; i++){
        var currentCateg = {};
        for(var j = 0; j < blockLength[i]; j++){
            var currentBlock = {
                'title' : title.shift(),
                'date' : date.shift(),
                'imgLink' : imgLink.shift(),
                'link' : link.shift()
                };
            currentCateg[j] = currentBlock;
        }
        dict[categories[i]] = currentCateg;
      };
    });
}





var genRandomString = function (length) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

var sha512 = function (password, salt) {
  var hash = crypto.createHmac('sha512', salt);
  hash.update(password);
  var value = hash.digest('hex');
  return {
    salt: salt,
    passwordHash: value
  };
};

function saltHashPassword(userPassword) {
  var salt = genRandomString(16);
  var passwordData = sha512(userPassword, salt);
  return passwordData;
}

function checkHashPassword(userPassword, salt) {
  var passwordData = sha512(userPassword, salt);
  return passwordData;
}

// express service

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// mongodb client
var MongoClient = mongodb.MongoClient;

// connection

var url =
  'mongodb+srv://kumush:yndal99@cluster0.lk3yo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';

MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
  //Register
  app.post('/register', (request, response, next) => {
    var post_data = request.body;

    var plaint_password = post_data.password;
    var hash_data = saltHashPassword(plaint_password);
    var password = hash_data.passwordHash; // save password hash
    var salt = hash_data.salt;

    var firstName = post_data.firstName;
    var login = post_data.login;
    var lastName = post_data.lastName;

    var apiDataJson = {
      'login': login,
      'password': password,
      'salt': salt,
      'firstName': firstName,
      'lastName' : lastName,
    };

    var db = client.db('apidata');

    // check exists email
    db.collection('account')
      .find({ login: login })
      .count(function (err, number) {
        if (number != 0) {
          response.json('StudentID already exists');
          console.log('StudentID already exists');
        } else {
          // insert data
          db.collection('account').insertOne(
            apiDataJson,
            function (error, res) {
              response.json('Registration success exists');
              console.log('Registration success exists');
            }
          );
        }
      });
  });

  // get ApiData
  app.get('/apidata', (request, response) => {
    console.log(title);
    response.json(dict);

  });


  // 로그인
  app.post('/login', (request, response, next) => {
    var post_data = request.body;

    var login = post_data.login;
    var userPassword = post_data.password;

    var db = client.db('apidata');

    // check exists email
    db.collection('account')
      .find({ login: login })
      .count(function (err, number) {
        if (number == 0) {
          response.json('로그인 다시 확인하세요!');
          console.log('로그인 다시 확인하세요!');
        } else {
          // insert data
          db.collection('account').findOne(
            { login: login },
            function (err, user) {
              var salt = user.salt;
              var hashed_password = checkHashPassword(
                userPassword,
                salt
              ).passwordHash;
              var encrypted_password = user.password;
              if (hashed_password == encrypted_password) {
                response.json(user);
                console.log('Login success');
              } else {
                response.json('비밀번호 다시 확인하세요!');
                console.log('비밀번호 다시 확인하세요!');
              }
            }
          );
        }
      });
  });

  // start web server
  app.listen(1040, () => {
    axiosFunc();
    console.log('Connected to mongodb server, webserver running on port 1030');
  });
});

'use strict';
const Homey = require('homey');
module.exports = [
    {
        method: 'POST',
        path: '/authenticate/',
        fn: async (args, callback) => {
            try {
                let result = await Homey.app.authenticate(args.body.username, args.body.password);
                return callback(null,result);
            } catch (err) {
                return callback(err);
            }
        } 
    }
];

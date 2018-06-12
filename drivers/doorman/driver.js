'use strict';

const Homey = require('homey');

class MyDriver extends Homey.Driver {
	
	onInit() {
		this.log('Yale Doorman driver has been initialized');
	}
	
	updateCapabilities(lock)
	{
		let homeyDevice = this.getDevice({id: lock.deviceLabel});
		if (homeyDevice instanceof Error) return; 
		homeyDevice.updateCapabilities(lock);
	}
	
	onPairListDevices(data, callback) {
		let devices = [];
		if (!Homey.app.isConnected()) {
			callback(new Error("Please enter your credentials in the settings page first."));
		}
		else
		{
			let locks = Homey.app.getLocks();
			for (const lock of Object.values(locks)) {
				let capabilities = [];
					capabilities.push("locked");

				devices.push({
					data: {
						id: lock.deviceLabel,
					},
					capabilities: capabilities,
					name: lock.area,
				});
			}	
			callback(null, devices.sort(MyDriver._compareHomeyDevice));
		}
	}

	static _compareHomeyDevice(a, b) {
		if (a.name < b.name)
			return -1;
		if (a.name > b.name)
			return 1;
		return 0;
	}
	
}

module.exports = MyDriver;
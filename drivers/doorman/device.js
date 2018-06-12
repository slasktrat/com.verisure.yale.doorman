'use strict';

const Homey = require('homey');

class MyDevice extends Homey.Device {
	
	onInit() {
		this._deviceLabel = this.getData().id;
		let lockDevice = Homey.app.getLock(this._deviceLabel);
		this.updateCapabilities(lockDevice);

        this.registerCapabilityListener('locked', ( value, opts ) => {
        	let code = this.getSettings().code;
        	if(!code)
        		return Promise.reject('You must set the code to lock/unlock the door.');
        	return Homey.app.setTargetLockState(this._deviceLabel, value, code);
        });

        this.log(`Yale Doorman lock ${this.getName()} has been initialized`);
	}

	updateCapabilities(lockDevice) {
		if (typeof lockDevice != "undefined") {
			this.setCapabilityValue("locked", lockDevice.lockedState === 'LOCKED').catch(this.error);
		}
	}
}

module.exports = MyDevice;
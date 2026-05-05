let Service, Characteristic;

module.exports = (homebridge) => {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory('homebridge-dummy-garage-hzt', 'DummyGarage', DummyGarage);
};

class DummyGarage {
	constructor(log, config, api) {
		this.log = log;
		this.config = config;
		this.api = api;

		this.log("HZT HomeBridge Dummy Garage Plugin Loaded");

		this.name = config.name || "Dummy Garage";
		this.autoCloseDelay = config.autoCloseDelay === undefined ? 0 : Number(config.autoCloseDelay);

		this.cacheDirectory = api.user.persistPath();
		this.storage = require('node-persist');
		this.storage.initSync({ dir: this.cacheDirectory, forgiveParseErrors: true });
		this.cachedState = this.storage.getItemSync(this.name);

		this.lastOpened = new Date();
		this.service = new Service.GarageDoorOpener(this.name);
		this.setupGarageDoorOpenerService(this.service);

		this.informationService = new Service.AccessoryInformation()
			.setCharacteristic(Characteristic.Manufacturer, 'Frank M.')
			.setCharacteristic(Characteristic.Model, 'Tag der offenen Tür')
			.setCharacteristic(Characteristic.FirmwareRevision, 'ja leider')
			.setCharacteristic(Characteristic.SerialNumber, "0000000000001");
	}

	getServices() {
		return [this.informationService, this.service];
	}

	setupGarageDoorOpenerService(service) {
		this.log.debug("setupGarageDoorOpenerService");
		this.log.debug("Cached State: " + this.cachedState);

		if ((this.cachedState === undefined) || (this.cachedState === true)) {
			this.log.debug("Using Saved OPEN State");
			service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
		} else {
			this.log.debug("Using Default CLOSED State");
			service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
			service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
		}

		service.getCharacteristic(Characteristic.TargetDoorState)
			.onGet(() => service.getCharacteristic(Characteristic.TargetDoorState).value)
			.onSet((value) => {
				if (value === Characteristic.TargetDoorState.OPEN) {
					this.log("Opening: " + this.name);
					this.lastOpened = new Date();
					service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
					this.storage.setItem(this.name, true);
					this.log.debug("autoCloseDelay = " + this.autoCloseDelay);

					if (this.autoCloseDelay > 0) {
						this.log("Closing in " + this.autoCloseDelay + " seconds.");
						setTimeout(() => {
							this.log("Auto Closing");
							service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
							service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
							this.storage.setItem(this.name, false);
						}, this.autoCloseDelay * 1000);
					}
				} else if (value === Characteristic.TargetDoorState.CLOSED) {
					this.log("Closing: " + this.name);
					service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
					this.storage.setItem(this.name, false);
				}
			});
	}
}

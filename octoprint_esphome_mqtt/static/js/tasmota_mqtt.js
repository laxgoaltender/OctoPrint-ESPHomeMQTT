/*
 * View model for OctoPrint-ESPHomeMQTT
 *
 * Author: jneilliii
 * License: AGPLv3
 */
$(function() {
	function ESPHomeMQTTViewModel(parameters) {
		var self = this;

		self.loginStateViewModel = parameters[0];
		self.settingsViewModel = parameters[1];

		self.processing = ko.observableArray([]);
		self.arrRelays = ko.observableArray();
		self.selectedRelay = ko.observable();
		self.isPrinting = ko.observable(false);
		self.automaticShutdownEnabled = ko.observable(false);
		self.filteredSmartplugs = ko.computed(function(){
			return ko.utils.arrayFilter(self.arrRelays(), function(item) {
						return item.automaticShutdownEnabled() == true;
					});
		});
		self.show_sidebar = ko.computed(function(){
			return self.filteredSmartplugs().length > 0;
		});
		self.toggleShutdownTitle = ko.pureComputed(function() {
			return self.automaticShutdownEnabled() ? 'Disable Automatic Power Off' : 'Enable Automatic Power Off';
		});


		self.toggleShutdownTitle = ko.pureComputed(function() {
			return self.settingsViewModel.settings.plugins.esphome_mqtt.powerOffWhenIdle() ? 'Disable Automatic Power Off' : 'Enable Automatic Power Off';
		})

		// Hack to remove automatically added Cancel button
		// See https://github.com/sciactive/pnotify/issues/141
		PNotify.prototype.options.confirm.buttons = [];
		self.timeoutPopupText = gettext('Powering off in ');
		self.timeoutPopupOptions = {
			title: gettext('Automatic Power Off'),
			type: 'notice',
			icon: true,
			hide: false,
			confirm: {
				confirm: true,
				buttons: [{
					text: gettext('Cancel Power Off'),
					addClass: 'btn-block btn-danger',
					promptTrigger: true,
					click: function(notice, value){
						notice.remove();
						notice.get().trigger("pnotify.cancel", [notice, value]);
					}
				}]
			},
			buttons: {
				closer: false,
				sticker: false,
			},
			history: {
				history: false
			}
		};

		self.onToggleAutomaticShutdown = function(data) {
			if (self.settingsViewModel.settings.plugins.esphome_mqtt.powerOffWhenIdle()) {
				$.ajax({
					url: API_BASEURL + "plugin/esphome_mqtt",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "disableAutomaticShutdown"
					}),
					contentType: "application/json; charset=UTF-8"
				})
			} else {
				$.ajax({
					url: API_BASEURL + "plugin/esphome_mqtt",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "enableAutomaticShutdown"
					}),
					contentType: "application/json; charset=UTF-8"
				})
			}
		}

		self.abortShutdown = function(abortShutdownValue) {
			self.timeoutPopup.remove();
			self.timeoutPopup = undefined;
			$.ajax({
				url: API_BASEURL + "plugin/esphome_mqtt",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "abortAutomaticShutdown"
				}),
				contentType: "application/json; charset=UTF-8"
			})
		}

		self.onStartup = function() {
			var sidebar_tab = $('#sidebar_plugin_esphome_mqtt');
			sidebar_tab.removeClass('overflow_visible in').addClass('collapse').siblings('div.accordion-heading').children('a.accordion-toggle').addClass('collapsed');
		}

		self.onBeforeBinding = function() {
			self.arrRelays(self.settingsViewModel.settings.plugins.esphome_mqtt.arrRelays());
		}

		self.onAfterBinding = function() {
			$.ajax({
				url: API_BASEURL + "plugin/esphome_mqtt",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "checkStatus"
				}),
				contentType: "application/json; charset=UTF-8"
			});
		}

		self.onEventSettingsUpdated = function(payload) {
			self.settingsViewModel.requestData();
			self.arrRelays(self.settingsViewModel.settings.plugins.esphome_mqtt.arrRelays());
		}

		self.onEventPrinterStateChanged = function(payload) {
			if (payload.state_id == "PRINTING" || payload.state_id == "PAUSED"){
				self.isPrinting(true);
			} else {
				self.isPrinting(false);
			}
		}

		self.onDataUpdaterPluginMessage = function(plugin, data) {
			if (plugin != "esphome_mqtt") {
				return;
			}
			if (data.hasOwnProperty("noMQTT")) {
				new PNotify({
							title: 'ESPHome-MQTT Error',
							text: 'Missing the <a href="https:\/\/plugins.octoprint.org\/plugins\/mqtt\/" target="_blank">MQTT<\/a> plugin. Please install that plugin to make this plugin operational.',
							type: 'error',
							hide: false
							});
				return;
			} 
			if (data.hasOwnProperty("powerOffWhenIdle")) {
				self.settingsViewModel.settings.plugins.esphome_mqtt.powerOffWhenIdle(data.powerOffWhenIdle);

				if (data.type == "timeout") {
					if ((data.timeout_value != null) && (data.timeout_value > 0)) {
						self.timeoutPopupOptions.text = self.timeoutPopupText + data.timeout_value;
						if (typeof self.timeoutPopup != "undefined") {
							self.timeoutPopup.update(self.timeoutPopupOptions);
						} else {
							self.timeoutPopup = new PNotify(self.timeoutPopupOptions);
							self.timeoutPopup.get().on('pnotify.cancel', function() {self.abortShutdown(true);});
						}
					} else {
						if (typeof self.timeoutPopup != "undefined") {
							self.timeoutPopup.remove();
							self.timeoutPopup = undefined;
						}
					}
				}
				return;
			} 
			if (data.hasOwnProperty("topic")) {
				var relay = ko.utils.arrayFirst(self.settingsViewModel.settings.plugins.esphome_mqtt.arrRelays(),function(item){
					return (item.topic() == data.topic) && (item.relayN() == data.relayN);
					}) || {'topic':data.topic,'relayN':data.relayN,'currentstate':'UNKNOWN'};
				if(relay.currentstate != data.currentstate) {
					relay.currentstate(data.currentstate);
				}
				self.processing.remove(data.topic + '|' + data.relayN);
				return;
			}
		};

		self.relayClick = function(data) {
			self.processing.push(data.topic() + '|' + data.relayN());
			switch(data.currentstate()) {
				case "ON":
					if(data.warn() || (data.warnPrinting() && self.isPrinting())){
						self.selectedRelay(data);
						$("#ESPHomeMQTTWarning").modal("show");
					} else {
						self.toggleRelay(data);
					}
					break;
				case "OFF":
					self.toggleRelay(data);
					break;
				default:
					$.ajax({
						url: API_BASEURL + "plugin/esphome_mqtt",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "checkRelay",
							topic: data.topic(),
							relayN: data.relayN()
						}),
						contentType: "application/json; charset=UTF-8"
					});
			}
		}

		self.cancelClick = function(data) {
			self.processing.remove(data.topic() + '|' + data.relayN());
		}

		self.toggleRelay = function(data) {
			$("#ESPHomeMQTTWarning").modal("hide");
			$.ajax({
				url: API_BASEURL + "plugin/esphome_mqtt",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "toggleRelay",
					topic: data.topic(),
					relayN: data.relayN()
				}),
				contentType: "application/json; charset=UTF-8"
			});
		};

		self.addRelay = function() {
			self.selectedRelay( {'topic':ko.observable('sonoff'),
								'relayN':ko.observable(''),
								'icon':ko.observable('icon-bolt'),
								'automaticShutdownEnabled':ko.observable(false),
								'warn':ko.observable(true),
								'warnPrinting':ko.observable(true),
								'errorEvent':ko.observable(false),
								'gcode':ko.observable(false),
								'gcodeOnDelay':ko.observable(0),
								'gcodeOffDelay':ko.observable(0),
								'connect':ko.observable(false),
								'connectOnDelay':ko.observable(15),
								'disconnect':ko.observable(false),
								'disconnectOffDelay':ko.observable(0),
								'sysCmdOn':ko.observable(false),
								'sysCmdRunOn':ko.observable(""),
								'sysCmdOnDelay':ko.observable(0),
								'sysCmdOff':ko.observable(false),
								'sysCmdRunOff':ko.observable(""),
								'sysCmdOffDelay':ko.observable(0),
								'currentstate':ko.observable('UNKNOWN'),
								'event_on_upload':ko.observable(false),
								'event_on_startup':ko.observable(false)} );
			self.settingsViewModel.settings.plugins.esphome_mqtt.arrRelays.push(self.selectedRelay());
			$("#ESPHomeMQTTRelayEditor").modal("show");
		}

		self.removeRelay = function(data) {
			self.settingsViewModel.settings.plugins.esphome_mqtt.arrRelays.remove(data);
			$.ajax({
					url: API_BASEURL + "plugin/esphome_mqtt",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "removeRelay",
						topic: data.topic(),
						relayN: data.relayN()
					}),
					contentType: "application/json; charset=UTF-8"
				});
		}

		self.editRelay = function(data) {
			self.selectedRelay(data);
			$("#ESPHomeMQTTRelayEditor").modal("show");
		}
	}

	/* view model class, parameters for constructor, container to bind to
	 * Please see http://docs.octoprint.org/en/master/plugins/viewmodels.html#registering-custom-viewmodels for more details
	 * and a full list of the available options.
	 */
	OCTOPRINT_VIEWMODELS.push({
		construct: ESPHomeMQTTViewModel,
		// ViewModels your plugin depends on, e.g. loginStateViewModel, settingsViewModel, ...
		dependencies: ["loginStateViewModel", "settingsViewModel"],
		// Elements to bind to, e.g. #settings_plugin_esphome-mqtt, #tab_plugin_esphome-mqtt, ...
		elements: ["#settings_plugin_esphome_mqtt","#navbar_plugin_esphome_mqtt","#sidebar_plugin_esphome_mqtt_wrapper"]
	});
});

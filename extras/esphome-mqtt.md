---
layout: plugin

id: esphome_mqtt
title: OctoPrint-ESPHomeMQTT
description: Plugin to control ESPHome devices via MQTT protocol.
author: jneilliii
license: AGPLv3

date: 2018-01-04

homepage: https://github.com/jneilliii/OctoPrint-ESPHomeMQTT
source: https://github.com/jneilliii/OctoPrint-ESPHomeMQTT
archive: https://github.com/jneilliii/OctoPrint-ESPHomeMQTT/archive/master.zip

follow_dependency_links: false

tags:
- esphome
- mqtt
- power

screenshots:
- url: /assets/img/plugins/esphome-mqtt/navbar.png
  alt: Navbar
  caption: Buttons on navigation bar
- url: /assets/img/plugins/esphome-mqtt/settings.png
  alt: Settings
  caption: ESPHome-MQTT Settings
- url: /assets/img/plugins/esphome-mqtt/relay_editor.png
  alt: Relay Editor
  caption: ESPHome-MQTT Relay Editor

featuredimage: /assets/img/plugins/esphome-mqtt/navbar.png
---

This plugin allows the control of [ESPHome](https://github.com/arendst/Sonoff-ESPHome) devices from within OctoPrint via [MQTT](https://github.com/arendst/Sonoff-ESPHome/wiki/MQTT-Overview#mqtt-overview) commands.

## Prerequisites

Install the [MQTT](https://github.com/OctoPrint/OctoPrint-MQTT) plugin via the Plugin Manager or manually using this url:

	https://github.com/OctoPrint/OctoPrint-MQTT/archive/master.zip
	
## Setup

Install via the Plugin Manager or manually using this URL:

    https://github.com/jneilliii/OctoPrint-ESPHomeMQTT/archive/master.zip

## Configuration

- Once installed your ESPHome devices will need to have the FullTopic configured as **%topic%/%prefix%/**
- Use the ESPHome device's topic in the ESPHome-MQTT Plugin settings for the individual relays.
- For multiple relay devices enter the index number that matches your desired relay.
- For single relay devices like the [iTead Sonoff S20 Smart Socket](https://www.itead.cc/smart-socket.html), leave Relay # blank.

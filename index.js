const debug = require('debug')('ilp-plugin-btp-coil')
const axios = require('axios')
const PluginBtp = require('ilp-plugin-btp')
const EventEmitter = require('events')

class Plugin extends EventEmitter {
  constructor (opts) {
    super()
    this.opts = opts
    this.reconnectTimeout = null
  }

  setConnectTimeout (time) {
    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect()
      } catch (e) {
        this.setConnectTimeout(5 * 1000)
      }
    }, time)
  }

  isConnected () {
    return !!this.plugin && this.plugin.isConnected()
  }

  async connect () {
    const btpTokenResponse = await axios({
      method: 'POST',
      url: 'https://coil.com/graphql',
      headers: {
        Authorization: this.opts.coilToken 
      },
      data: {
        query: '{\n        refreshBtpToken {\n          token\n        }\n      }',
        variables:{}
      }
    })

    if (this.plugin) {
      this.plugin.removeAllListeners()
    }

    console.log(JSON.stringify(btpTokenResponse.data, null, 2))
    const btpToken = btpTokenResponse.data.data.refreshBtpToken.token
    this.plugin = new PluginBtp({
      ...this.opts,
      btpToken
    })

    this.plugin.on('connect', () => this.emit('connect'))
    this.plugin.on('disconnect', () => this.emit('disconnect'))

    if (this.dataHandler) {
      this.plugin.registerDataHandler(this.dataHandler)
    }

    if (this.moneyHandler) {
      this.plugin.registerMoneyHandler(this.moneyHandler)
    }

    this.setConnectTimeout(1000 * 30 * 60)
    await this.plugin.connect()
  }

  sendData (data) {
    return this.plugin.sendData(data)
  }

  sendMoney (amount) {
    return this.plugin.sendData(amount)
  }

  async disconnect () {
    await this.plugin.disconnect()
    clearTimeout(this.reconnectTimeout)
  }

  registerDataHandler (handler) {
    this.dataHandler = handler
    if (this.plugin) {
      return this.plugin.registerDataHandler(handler)
    }
  }

  deregisterDataHandler (handler) {
    this.dataHandler = null
    if (this.plugin) {
      return this.plugin.deregisterDataHandler(handler)
    }
  }

  registerMoneyHandler (handler) {
    this.moneyHandler = handler
    if (this.plugin) {
      return this.plugin.registerMoneyHandler(handler)
    }
  }

  deregisterMoneyHandler (handler) {
    this.moneyHandler = null
    if (this.plugin) {
      return this.plugin.deregisterMoneyHandler(handler)
    }
  }
}

Plugin.version = 2
module.exports = Plugin

/** @format */

"use strict"

module.exports = function CardSetter(mod) {
  const { command, game } = mod
  const fs = require("fs"),
    path = require("path"),
    dungeon = JSON.parse(fs.readFileSync(path.join(__dirname, "./data/dungeons.json"), "utf8"))
  function filepath(arg) {
    return `${__dirname}\\data\\${arg}.json`
  }
  function filepath2() {
    return `${__dirname}\\saves\\${game.me.name}-${game.me.serverId}.json`
  }

  let gameCardData, raceData, effectData, zoneData
  let effect1, effect2, preset1
  let playerSaveData = []
  const reg = new RegExp("^[0-9]+$")

  mod.hook("S_LOAD_TOPO", 3, () => {
    playerSaveData = []
    readFile("race")
    readFile("effect")
    readFile2()
  })

  game.me.on("change_zone", (zone, quick) => {
    if (playerSaveData) {
      zoneData = playerSaveData.find((p) => p.zone === zone)
    }
    if (zoneData) {
      command.message(`Entering in: ${zoneData.name} Preset: ${zoneData.preset} Effect: ${zoneData.effect1} / ${zoneData.effect2}`)
      mod.send("C_CHANGE_CARD_PRESET", 1, { preset: zoneData.preset })
      unsetEffect()
      mod.send("C_CHANGE_CARD_EFFECT_CHECK", 1, { id: zoneData.effect1 })
      mod.send("C_CHANGE_CARD_EFFECT_CHECK", 1, { id: zoneData.effect2 })
    }
  })

  command.add("decksetter", (arg0, arg1, arg2) => {
    mod.hook("S_CARD_DATA", 1, (event) => {
      gameCardData = event.presets
    })
    if (arg0 && arg0.length > 0) {
      arg0 = arg0.toLowerCase()
      if (reg.test(arg0)) {
        mod.send("C_CHANGE_CARD_PRESET", 1, { preset: arg0 - 1 })
        preset1 = arg0 - 1
      } else {
        if (arg0 == "remove") {
          removePlayerSaveDataWithCurrentZone()
        } else if (arg0 == "list") {
          effectData.forEach((effect) => {
            command.message(effect.name)
            command.message("id: " + effect.id + " - acronyme: " + effect.acronyme)
          })
        } else {
          checkPresetByRace(arg0, raceData)
        }
      }
    }
    if (arg1 && arg1.length > 0) {
      arg1 = arg1.toLowerCase()
      if (reg.test(arg1)) {
        unsetEffect()
        var a
        a = parseInt(arg1)
        mod.send("C_CHANGE_CARD_EFFECT_CHECK", 1, { id: a })
        effect1 = a
      } else {
        loopArg(a, arg1)
      }
    }
    if (arg2 && arg2.length > 0) {
      arg2 = arg2.toLowerCase()
      if (reg.test(arg2)) {
        var b
        b = parseInt(arg2)
        mod.send("C_CHANGE_CARD_EFFECT_CHECK", 1, { id: b })
        effect2 = b
      } else {
        loopArg(b, arg2)
      }
    }
    if (arg0 && arg1 && arg2) {
      updatePlayerSaveDataWithCurrentZone()
    }
    if (!arg0 && !arg1 && !arg2) {
      command.message("use !decksetter list to list card effect id and acronyme")
      command.message("use !decksetter remove to delete zone save setings")
      command.message("use !decksetter preset1 (id or racetype) effect1(acronyme or id) effect_2(acronyme or id)")
    }
  })

  mod.hook("S_CARD_DATA", 1, (event) => {
    gameCardData = event.presets
  })

  function loopArg(arg, boobool) {
    if (boobool == true) unsetEffect()
    effectData.forEach((effect) => {
      if (arg == effect.acronyme) setEffect(arg, boobool)
    })
  }

  function checkPresetByRace(race, raceData) {
    var count = 0
    var presetRaceSelected = null
    gameCardData.forEach((presets) => {
      for (const key in presets) {
        presets.presetCards.forEach((presetCard) => {
          if (raceData[race].includes(presetCard.cardId)) {
            presetRaceSelected = count
            mod.send("C_CHANGE_CARD_PRESET", 1, { preset: count })
            preset1 = count
          }
        })
      }
      count++
    })
    if (presetRaceSelected == null) command.message("Aucun page ne contient de bonus contre cette race")
  }

  function unsetEffect() {
    effectData.forEach((effect) => {
      mod.send("C_CHANGE_CARD_EFFECT_UNCHECK", 1, { id: effect.id })
    })
  }

  function setEffect(arg, boobool) {
    effectData.forEach((effect) => {
      if (arg == effect.acronyme) {
        mod.send("C_CHANGE_CARD_EFFECT_CHECK", 1, { id: effect.id })
        if (boobool) effect1 = effect.id
        if (!boobool) effect2 = effect.id
      }
    })
  }

  function updatePlayerSaveDataWithCurrentZone() {
    zoneData = playerSaveData.find((z) => z.zone == game.me.zone)
    if (!zoneData) {
      playerSaveData.push({
        zone: game.me.zone,
        name: dungeon[game.me.zone]["en"],
        preset: preset1,
        effect1: effect1,
        effect2: effect2,
      })
    } else {
      command.message("zone already saved plz use !decksetter remove then")
      command.message("use !decksetter preset1 (id or racetype) effect1(acronyme or id) effect_2(acronyme or id)")
    }
    writeFile()
  }

  function removePlayerSaveDataWithCurrentZone() {
    zoneData = playerSaveData.find((z) => z.zone == game.me.zone)
    if (zoneData) {
      let counter = 0
      playerSaveData.forEach((save) => {
        if (zoneData.zone == save.zone) {
          playerSaveData.splice(counter, 1)
        }
        counter++
      })
      writeFile()
    }
  }

  function readFile(arg) {
    fs.readFile(filepath(arg), (err, data) => {
      if (err) throw err
      switch (arg) {
        case "race":
          raceData = JSON.parse(data)
          break
        case "effect":
          effectData = JSON.parse(data)
      }
    })
  }

  function readFile2() {
    if (!fs.existsSync(filepath2())) return
    fs.readFile(filepath2(), (err, data) => {
      if (err) mod.log(err)
      playerSaveData = JSON.parse(data)
    })
  }

  function writeFile() {
    playerSaveData.sort((a, b) => {
      return a.zone - b.zone
    })

    fs.writeFile(filepath2(), JSON.stringify(playerSaveData, null, 2), (err) => {
      if (err) mod.log(err)
    })
  }
}

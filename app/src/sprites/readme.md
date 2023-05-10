# Generates sprites for MapX

Wrapper for 

- `@mapbox/spritezero` -> svg to sprites 
- `svgo` -> svg optimisation
- `webfont` -> webfont building 


## Usage

Config `config.json`
```json
{
  "svgs" :  "./source/svg/**/svg/*.svg", -> sources of svgs to convert
  "ttfs": "./source/ttf/*.ttf", -> source of ttf font to handle 
  "ratios": [1, 2, 4], -> sprites device pixel ratio
  "out":"./dist", -> out directory 
  "fontNameSvg":"mx" -> generated font name 
}
```

Launch : `npm run build`

### Caveats

*This requires node 10. Tested with node 10.24*

Ex. with n ( node version manager )

1. Check current version of node. ex. `n` => `14.16.0` 
2. Stop all nodes processes ( compiler, server, etc..)
3. Install/Use correct version of node, if required : `$ n` select `10.24.1` or `$ n 10.24.1` to install it
4. Launch the script `node index.js`
5. Reset original node version. ex. `$ n` select `14.16.0`


 

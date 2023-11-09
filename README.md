![repository-banner.png](https://res.cloudinary.com/alvarosaburido/image/upload/v1612193118/as-portfolio/Repo_Banner_kexozw.png)

# Auto Flow

Auto Flow is a Chrome extension that allows you to automatically click buttons or fill forms in a webpage.

## Features

- Fill forms automatically.
- Fill forms with a single click.

## Development Or Production

```bash
# install dependencies
$ yarn

# build in dev mode
$ yarn start

# build for production 
$ yarn build
```

### About `yarn start`

this is a dev mode, it will watch for changes in the `src` directory and will automatically build the project with dev mode.

After building the project, you can go to `chrome://extensions/` page and toggle `Auto flow` extension OFF and then ON again.


## Testing locally on Chrome

In order to test the package holding the extension in Chrome we need to:
1. Go to `chrome://extensions/` page.
2. Toggle `Developer mode` ON.
3. Select `Load Unpacked`.
4. Select the `/dist` directory.

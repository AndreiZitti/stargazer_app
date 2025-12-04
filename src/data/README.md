# Data Files

## light-pollution-sample.json

Sample light pollution data for development/testing.

- Coverage: Central Europe (roughly Germany area)
- Resolution: 10km per grid cell
- Values: Bortle scale 1-9 (lower = darker)

## Production Data

For production, download VIIRS nighttime lights data from:
- https://www.lightpollutionmap.info (export GeoTIFF)
- https://eogdata.mines.edu/products/vnl/ (NASA VIIRS)

Process into the same JSON format with higher resolution (~1km).

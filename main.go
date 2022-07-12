// package image_color_inverter
package main

import (
	"fmt"
	"log"
	"os"
	"path"
	"strings"
	"sync"
	"time"

	_ "image/jpeg"
	_ "image/png"

	"github.com/disintegration/imaging"
	"github.com/urfave/cli/v2"
)

type ReadDirContentsOptions struct {
	Recursive          bool
	FilterByExtensions []string
}

var ValidImageExtensions = [...]string{".jpg", ".jpeg", ".png"}

func main() {
	app := &cli.App{
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:    "dir",
				Aliases: []string{"d"},
				Value:   ".",
				Usage:   "directory containing images to be inverted",
			},
			&cli.StringFlag{
				Name:    "file",
				Aliases: []string{"f"},
				Usage:   "name of the image file to be inverted",
			},
			&cli.BoolFlag{
				Name:    "recursive",
				Aliases: []string{"r"},
				Value:   false,
				Usage:   "invert images recursively for subfolders of the provided '--dir'",
			},
		},
		Action: func(ctx *cli.Context) error {
			start := time.Now()

			recursive := ctx.Bool("recursive")
			dir := ctx.String("dir")
			file := ctx.String("file")

			if recursive {
				if file != "" {
					log.Fatalln("--recursive option may not be specified when providing a --file")
				}
			}

			if dir != "." && file != "" {
				log.Fatalln("--directory and --filename options may not be provided simultaneously")
			}

			var err *error
			ch := make(chan string, 25)

			counter := 0

			go readDirContents(ch, err, dir, ReadDirContentsOptions{
				Recursive:          recursive,
				FilterByExtensions: ValidImageExtensions[:],
			})

			wg := &sync.WaitGroup{}
			for file := range ch {
				counter++
				wg.Add(1)
				go invertImage(wg, file)
			}
			if err != nil {
				log.Fatal(err)
			}

			wg.Wait()

			fmt.Printf("Inverted %d images in %dms\n", counter, time.Now().Sub(start).Milliseconds())

			return nil
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}

func readDirContents(ch chan<- string, readErr *error, dir string, opts ReadDirContentsOptions) error {
	shouldFilter := len(opts.FilterByExtensions) != 0
	extensionFilters := map[string]bool{}
	if shouldFilter {
		for _, ext := range opts.FilterByExtensions {
			extensionFilters[ext] = true
		}
	}

	var dirReader func(dir string, recursive bool, dirname string) error
	dirReader = func(dir string, recursive bool, dirname string) error {
		dirents, err := os.ReadDir(dir)
		if err != nil {
			*readErr = err
			close(ch)
			return err
		}

		for _, dirent := range dirents {
			fullRelPath := path.Join(dirname, dirent.Name())
			if dirent.IsDir() {
				if recursive {
					err := dirReader(fullRelPath, true, fullRelPath)
					if err != nil {
						*readErr = err
						close(ch)
						return err
					}
				}
			} else if !shouldFilter || extensionFilters[strings.ToLower(path.Ext(dirent.Name()))] {
				ch <- fullRelPath
			}
		}

		return nil
	}

	var err error

	if dir == "." {
		err = dirReader(dir, opts.Recursive, "")
	} else {
		err = dirReader(dir, opts.Recursive, dir)
	}

	close(ch)

	return err
}

func invertImage(wg *sync.WaitGroup, file string) {
	src, err := imaging.Open(file)
	if err != nil {
		log.Fatalf("failed to open image: %v", err)
	}

	src = imaging.Invert(src)
	err = imaging.Save(src, file)
	if err != nil {
		log.Fatalf("failed to open image: %v", err)
	}
	wg.Done()
}

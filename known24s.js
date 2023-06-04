const fs = require('fs');
const { spawn } = require('child_process');
const config = require('./config.json')

async function known24s() {
  // copy ips1
  const writeStream = fs.createWriteStream('./ips2');

  fs.open('ips1', 'r', function(status, fd) {
    if (status) {
      console.log(status.message);
      return;
    }
    const size = fs.statSync('ips1').size;
    var buffer = Buffer.alloc(size);
    fs.read(fd, buffer, 0, buffer.length, 0, function(err, num) {
      writeStream.write(buffer);
    })
  })
  
  ips = {};
  fs.open('ips1', 'r', function(status, fd) {
    if (status) {
      console.log(status.message);
      return;
    }
    const size = fs.statSync('ips1').size;
    var buffer = Buffer.alloc(size);
    fs.read(fd, buffer, 0, buffer.length, 0, function(err, num) {
      console.log(`size: ${size}`);

      for (var i = 0; i < buffer.length; i += 6) ips[`${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.0/24`] = 0;

      fs.writeFile('./includeFile.txt', JSON.stringify(Object.keys(ips)).replaceAll('"', '').replaceAll('[', '').replaceAll(']', ''), function (err) {
        if (err) console.error(err);
        const childProcess = spawn('sh', ['-c', `sudo masscan -p 25540-25700 --include-file includeFile.txt --rate=${config.packetLimit} --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ masscan2.json`]);

        childProcess.stdout.on('data', (data) => {
          var string = data.toString();
          if (leftOver == null) string = string.substring(string.indexOf('{'));
          if (leftOver != null) string = leftOver + string;
          for (var i = 0; i < string.split('\n,\n').length - 1; i++) {
            var line = string.split('\n,\n')[i];
            if (line.startsWith('\n') || line.startsWith(',') == '') continue;
            const obj = JSON.parse(line);
            for (const port of obj.ports) {
              if (port.reason !== "syn-ack") {
                const splitIP = obj.ip.split('.');
                const buffer = Buffer.from([
                  parseInt(splitIP[0]),
                  parseInt(splitIP[1]),
                  parseInt(splitIP[2]),
                  parseInt(splitIP[3]),
                  Math.floor(port.port / 256),
                  port.port % 256
                ]);
                writeStream.write(buffer);
              }
            }
            try {
              const obj = JSON.parse(string.split('\n,\n')[string.split('\n,\n').length - 1]);
              for (const port of obj.ports) {
                if (port.reason !== "syn-ack") {
                  const splitIP = obj.ip.split('.');
                  const buffer = Buffer.from([
                    parseInt(splitIP[0]),
                    parseInt(splitIP[1]),
                    parseInt(splitIP[2]),
                    parseInt(splitIP[3]),
                    Math.floor(port.port / 256),
                    port.port % 256
                  ]);
                  writeStream.write(buffer);
                }
              }
              leftOver = '';
            } catch (err) {
              leftOver = string.split('\n,\n')[string.split('\n,\n').length - 1];
            }
          }
        });

        childProcess.stderr.on('data', (data) => {
          console.error(data.toString());
        });

        childProcess.on('close', async (code) => {
          if (code === 0) {
            console.log('Masscan finished.');
            writeStream.end();
            //knownIps();
          } else {
            console.error(`Command exited with code ${code}`);
          }
        });
      });
    });
  });
}

known24s();
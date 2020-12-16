import Post from "../../../components/posts/post";

import Gist from "react-gist";

export const meta = {
    published: true,
    publishedAt: "December 15, 2020",
    summary: "Adding ambient light support to Linux on the Surface Pro 7``",
    title: "Adding ambient light support to Linux and GNOME on the Surface Pro 7",
    id: "mshw0184"
};

const MSHW0184 = () => {
    return (
        <Post title={meta.title} date={meta.date}>
            <p>A couple of a week ago I picked up a Surface Pro 7 (i3 1.2 mhz) at a Black Friday sale.
             I love making devices run software they shouldn't, so I got to work dual-booting Linux on it. 
             To my surprise, almost everything worked with the default Fedora 33 kernel, not including the touchscreen, 
             the ambient light sensor, and the camera. After compiling and loading the great <a href="https://github.com/linux-surface/linux-surface">linux-surface</a> kernel 
             the touchscreen started to work but I found a <a href="https://github.com/linux-surface/linux-surface/issues/121">GitHub issue</a> someone had made detailing that the ambient
              light sensor (a MSHW0184) isn't detected. This normally wouldn't matter a lot, but I'd discovered that GNOME supported adusting the screen brightness based on the ambient light through <a href="https://gitlab.freedesktop.org/hadess/iio-sensor-proxy/">iio-sensor-proxy</a>.</p>
           <p>I knew nothing (and still know very little) about the Linux kernel or drivers, but this seemed like a great place to start. Luckily, GitHub user archseer discovered that the MSHW0184 registers align with the APDS9960 device, which already has an upstream kernel driver, and he mentioned all that should be needed is a small change to allow the driver to detect the new device.</p>
           <p>Here I realized I had to do some research into how the kernel loads drivers. I knew that drivers could either be statically built into the kernel, or built as kernel modules so they can be dynamically loaded when they're needed. But how does the kernel know when to load specific drivers for certain hardware? You register the ID with a matching table.</p>
           <p>Initially, I tried adding the MSHW0184 device ID to the existing match table in the APDS9960 driver for the i2c protocol. This consisted of the following one-line change:</p>
           <p>
               <pre>
{`static const struct i2c_device_id apds9960_id[] = {
                    { "apds9960", 0 },
+                   { "MSHW0184, 0 }
                    {}
}`}</pre>
           </p>
           <p>
                However, this didn't work and I realized the conventions seemed a little odd: no other i2c device ids in other drivers contained capitals or were ambient light sensing devices. Thankfully, someone on IRC helped me out:
           </p>
           <p>
                <pre>
                    00:53 &#60;djrscally&#62; That's an acpi ID <br />
                    00:53 &#60;djrscally&#62; You probably need to add an ACPI match table
                </pre>
           </p>
            <p>
                A few minutes later (well, probably closer to an hour after all the recompiling and testing) I had the following:
                <pre>
                    {`
+ static const struct acpi_device_id apds9960_acpi_match[] = {
    +	{ "MSHW0184" },
    +	{ }
    +};
+ MODULE_DEVICE_TABLE(acpi, apds9960_acpi_match);

  static struct i2c_driver apds9960_driver = {
    .driver = {
        .name	= APDS9960_DRV_NAME,
        .of_match_table = apds9960_of_match,
        .pm	= &apds9960_pm_ops,
+       .acpi_match_table = apds9960_acpi_match,
    },
    .probe		= apds9960_probe,
    .remove		= apds9960_remove

                `}
                </pre>
            </p>
           <p>
                I recompiled the kernel module, rebooted, and verified the driver was matched with <code>lsmod</code> and ensured the driver paired with the device by navigating to the IIO device (finding the path to the device took a lot more work than I'd like to admit) and reading in the <code>in_intensity_clear_raw</code> file:
                <pre>
                 {`
 max@surface ~> cat sys/bus/iio/devices/iio\:device0/in_intensity_clear_raw
    33`
                    }
                </pre>
            </p>
            <p>
                The joy I felt seeing that file exist and the output can't be overstated... I had something to work with!
                </p>
            <p>
                I wasn't done yet though &mdash; GNOME still didn't show me an option to automatically adjust the screen brightness.
                After someone else verified they also had the device loaded with the modified driver but not in GNOME I 
                determined the problem was somewhere in <code>iio-sensor-proxy</code>. I cloned the iio-sensor-proxy repository and started digging. 
            </p>
            <p>
                The first thing I always do when I clone a new repo is expand and quickly look over every folder (assuming the repo is a reasonable size) and that served me well here. 
                I found the following file <code>80-iio-sensor-proxy.rules</code>:
            </p>
            <p>
                <Gist id="deb10de26fffb930758de7d09c853f73" />
            </p>
            <p>
                As you might be able to figure out, each <code>TEST</code> file is checked for existence and is used to determine whether or not the device should be used by iio-sensor-proxy.
            </p>
            <p>I hadn't seen any of the seemingly relevant files, <code>in_illuminance_*</code>, so I added my own line: 
            <pre>{`
SUBSYSTEM=="iio", TEST=="in_intensity_clear_raw", ENV{IIO_SENSOR_PROXY_TYPE}+="iio-poll-als"`}</pre>
            </p>
            <p>
                After another small iio-sensor-proxy change and running again the device was now discovered by iio-sensor-proxy! The full merge request can be seen <a href="https://gitlab.freedesktop.org/hadess/iio-sensor-proxy/-/merge_requests/319">here</a>. The option appeared in GNOME and I now have automatic adjusting brightness! 
            </p>
            <p>
                It kind of sucks though and isn't very consistent. As it turns out, <code>intensity_clear != illuminance</code>, which is what most programs expect from ambient light sensors, so I need to figure out and perform some math in iio-sensor-proxy to translate the RGBC values to lux. 
            </p>
            <p>
                If you've made it this far (or are here to get the code yourself), the modified driver (with basic proximity sensing support too) can be found here: <a href="https://github.com/maxleiter/mSHW0184">https://github.com/maxleiter/MSHW0184</a>.
            </p>
            <p>Major thanks to everyone that helped me in the ##linux-surface IRC channel. It was great to finally get a little low-level with Linux. </p>
           <style jsx>{`
                p {
                    line-height: 1.3;
                    font-size: 16px;
                    margin-top: 8px;
                    margin-bottom: 8px;
                }

                a {
                    cursor: pointer;
                    text-decoration: underline;
                }

                p pre {
                    margin-left: 40px;
                    margin-bottom: 0;
                    margin-top: 0;
                }
            `}</style>
        </Post>)
}

export default MSHW0184;
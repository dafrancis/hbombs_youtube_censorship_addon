/*jslint browser */
/*global window, MutationObserver, InstallTrigger */

(function () {
    "use strict";

    /*
     * Debug mode. Turn true when developing remembering to turn false when
     * uploading changes. I did this cause I added some contrived way to not
     * show errors and debug messages in production (which would then allow
     * someone to see how bad the source is but since I'm releasing this
     * anyway..)
     *
     * Also, despite having this in, Mozilla code reviewers tend to not like it
     * (even though it's unlikely in production a console method would be
     * called). Maybe I could think of a more elegant solution to having a
     * "Debug Mode" in future, but sorry Mozilla reviewers I'm going to keep
     * this in.
     */
    var DEBUG = true;

    /*
     * Shouts out to http://stackoverflow.com/a/9851769 for the handy dandy list
     * of variables in which I only use in one place for one thing.
     */
    // Firefox 1.0+
    var isFirefox = !!window.InstallTrigger;

    /*
     * You may wonder what's the weird UCblahblah id. That's youtube's channel
     * id. Sometimes, when a channel isn't given a user id, it'll use the
     * channel id. However, in recommendations there isn't a consistency between
     * whether a user name or a channel id is used, so in this case whenever
     * there are a name and a channel ID are on the same line it's more than
     * likely it's pointing to the same channel.
     *
     * I figured out the best way to get the channel id was to go to the channel
     * page and paste the following into a javascript console:
     *     document.querySelector('meta[itemprop=channelId]').content
     */
    var BAD_CHANNELS = [
        'maddoxaom', 'UC_c1gdsojLxBGkgzS0NsvUw',
        'Aurini', "UC6TJdRrZR_WacbxJWiRZ5_g",
        'thunderf00t', 'UCmb8hO2ilV9vRa8cilis88A',
        'SargonofAkkad100', "UC-yewGHQbNFpDrGM0diZOLA",
        'UC6cMYsKMx6XicFcFm7mTsmA', // Sargon has 3 other channels for some reason
        'UCg57OqktnnvRc3HRPGnXKTg', // Like seriously
        'UCSMG40p6XHFTeXv5noF6Wdw', // Who needs that many channels?
        'americassurvival', "UCukW9fbX4m5MpOmQ2M5isVg",
        'MensBusinessAsocEduc', "UCsqXlj9Tj5oaZX3xPLCxWSw",
        'RockingMrE', "UCzOnXvfwc32YEiwTe_8Nf-g",
        'jordanowen42', "UChi4TtLzwVnMQ5xHwaxWD-g",
        'stefbot', "UCC3L8QaxqEGUiBC252GHy3w",
        'TheAmazingAtheist', 'UCjNxszyFPasDdRoD9J6X-sw',
        'MrRepzion', "UC228Y4vvOMPieeT_XYTbe-A",
        'UCcc_zG4pMLpuefQQs25e4bg', // The Atheist Gamer
        'UCfYbb7nga6-icsFWWgS-kWw', // Mister Metokur
        'theignoredgender', "UCIEO_w-8_voXDymte5KYw_A",
        'weevlos', "UCZZFrPKyH-Le2uoPGnn5jyg",
        'UCMIj-wEiKIcGAcLoBO2ciQQ', // Teal Deer / tl;dr
        'UCvsye7V9psc-APX6wV1twLg', // Alex Jones Infowars Dot Com
        'AlphaOmegaSin', "UCVtEytgcL5fZcSiKx-BjimQ",
        'MundaneMatt', "UCVtEytgcL5fZcSiKx-BjimQ",
        'PragerUniversity', 'UCZWlSUNDvCCS1hBiXV0zKcA',
        'realmattforney', 'UCFc0stDRUkeBDc36qZeox1g',
        'NateTalksToYou', 'UCvBSa6Tzhiz7MrVI_DkwvWA',
        'UCh-Bu3sMGxYW53LalZufHew', // UMass College Republicans
        'hunteravallone', 'UCDgchsbJnrX604K-xWsd-fQ',
        'UCctjGdm2NlMNzIlxz02IsXA', // Chris Ray Gun
        'UCoNGo02Aai6VQotn-MNnbpw', // Rekt Feminist Videos
        'TokyoAtomic', 'UCmrLCXSDScliR7q8AxxjvXg'
    ];

    var debug_console = {
        apply_to_console: function (method, args) {
            if (DEBUG) {
                console[method].apply(console, args);
            }
        },
        log: function (...args) {
            this.apply_to_console("log", args);
        },
        error: function (...args) {
            this.apply_to_console("error", args);
        }
    };

    function is_bad_user(user) {
        return BAD_CHANNELS.indexOf(user) !== -1;
    }

    function get_channel_name(link) {
        return link.pathname.replace(/^\/(user|channel)\//, '');
    }

    function loop_over(list, callback) {
        Array.from(list).forEach(callback);
    }

    function check_and_block_video(video, user) {
        if (is_bad_user(user) && video.style.display !== "none") {
            debug_console.log("HBCA: blocking video for: " + user);
            video.style.display = "none";
        }
    }

    /*
     * Traversing the DOM is a huge pain in the butt and is quite obviously the
     * worst bit of javscript. When you know the html structure of what you want
     * is in a certain way but you can't guarantee that you're going to grab
     * that every time you need to be a little careful.
     * Going element.children[0].children[1] may normally throw an exception,
     * but with this, all you need to do is crawl_children(element, [0, 1]) and
     * if any point fails it returns null. Trying to access null though will
     * probab-DEFINITELY throw an exception so the best thing to do is to check
     * for null before doing the next thing. Its a huge pain in the butt, but
     * it's all the fun in writing extensions using javascript.
     */

    function crawl_children(element, children_list) {
        var final_element = element;
        children_list.forEach(function (child) {
            final_element = final_element && final_element.children;
            final_element = final_element && final_element[child];
        });
        return final_element || null;
    }

    /*
     * So there's three main sections where you get recommendations. The first
     * is the main feed (while the others are the sidebar and the endscreen). On
     * chrome There's "feed groups" which has titles that range from
     * "Recommended", "videos under a topic we think you'll like", and "videos
     * from a channel we think you'll like". This section does two things. First
     * it checks the group if it's in a "blocked channel". If so it hides it and
     * does nothing else with that group. If there isn't a channel associated,
     * it tries to look at each individual video and hides them individually.
     */

    function check_feed_video(video) {
        var details = crawl_children(video, [0, 0, 1]).children,
            user = get_channel_name(details[1].children[0]);
        check_and_block_video(video, user);
    }

    function check_feed(feed) {
        var videos = feed.children[1].children[0].children[0].children,
            user_link = feed.children[0].getElementsByTagName("a"),
            user = user_link.length && get_channel_name(user_link[0]);
        if (is_bad_user(user) && feed.style.display !== "none") {
            debug_console.log("HBCA: blocking feed for: " + user);
            feed.style.display = "none";
        } else {
            loop_over(videos, check_feed_video);
        }
    }

    /*
     * So guess what? Firefox has a different homepage to chrome. I mean it
     * makes sense I suppose but also it means I have to write some branching
     * code to check whether this should run the "firefox code" or the "chrome
     * code". Normally you'd only want to do that because the javascript engines
     * in each browser is radically different despite there being an ECMA
     * standard specification. At least this doesn't look too ugly, considering
     * I realised that checking the video thumbnail itself would literally be
     * the same as in chrome.
     */

    function check_firefox_feed_video(video) {
        check_feed_video(video);
    }

    function check_firefox_feed(feed) {
        var videos = feed.getElementsByClassName("yt-shelf-grid-item");
        loop_over(videos, check_firefox_feed_video);
    }

    function check_firefox_feeds(feed) {
        var feeds = feed.children[0].children;
        loop_over(feeds, check_firefox_feed);
    }

    /*
     * Hi! welcome to the ugliest bit of the code!
     * The sidebar was a huge monster in which I had to not only find another
     * way to get the channel id, but also make sure that I got the more videos
     * as well (this is why the observer bits later in the code were a godsend).
     *
     * To explain things, the videos list would be grabbed like this:
     *     [video, video, video, video, []]
     * See that blank list at the end? That's where the "more videos" go. They
     * only load as soon as you click "more videos" to which then the list will
     * be like:
     *     [video, video, video, video, [video, video, video]]
     * Web development is great and working with bullshit like this is what
     * makes the job worthwhile.
     */

    function check_sidebar_video(video) {
        var user_element, user;
        if (video.nodeName !== "LI") {
            if (video.id === "watch-more-related") {
                loop_over(video.children, check_sidebar_video);
            }
        } else {
            user_element = crawl_children(video, [0, 0, 2, 0]);
            user = user_element && user_element.dataset.ytid;
            check_and_block_video(video, user);
        }
    }

    function check_sidebar_section(section) {
        var videos = section.getElementsByClassName('watch-sidebar-body')[0].children[0].children;
        loop_over(videos, check_sidebar_video);
    }

    function check_sidebar(sidebar) {
        var sections = sidebar.children[1].children[2].children;
        loop_over(sections, check_sidebar_section);
    }

    /*
     * The endscreen is basically the grid of videos that shows up at the end of
     * a youtube video, which shows some recommendations. For some reason,
     * unlike the other places where there's an element which contains the
     * youtube id of the channel it's from, this section doesn't have such a
     * thing. I thought of reverse lookuping the names to channels but that was
     * too much work for a small part, so I went with the next best thing and
     * just hid all the videos. It doesn't look too bad. That's good. Plus if I
     * hid even one video there would be weird holes and it wouldn't look as
     * good. I'm being clever. This was a good solution. Well done me.
     */

    function check_endscreen(endscreen) {
        endscreen.style.display = "none";
    }

    function main() {
        var feeds = document.getElementsByClassName("feed-item-dismissable"),
            sidebar = document.getElementsByClassName('watch-sidebar')[0],
            endscreen = document.getElementsByClassName('html5-endscreen')[0];

        function checker_catcher(label, checker, element) {
            if (element) {
                try {
                    checker(element);
                } catch (e) {
                    debug_console.error("HBCA: Error Checking %s: %s", label, e);
                }
            }
        }

        if (feeds && !isFirefox) {
            loop_over(feeds, function (feed) {
                checker_catcher("Feed", check_feed, feed);
            });
        } else if (isFirefox) {
            feeds = document.getElementById("feed-main-what_to_watch");
            checker_catcher("Feed", check_firefox_feeds, feeds);
        }

        checker_catcher("Sidebar", check_sidebar, sidebar);
        checker_catcher("Endscreen", check_endscreen, endscreen);
    }

    /*
     * So youtube is one of those fancy websites that instead of loading a new
     * page it loads it up using javascript and replaces what's on the page with
     * the newcontent. I mean, fine, but this plugin only does the blocking
     * after the page load. This where the observers come in. These check if any
     * changes are doneto the page via javascript and then trigger the script to
     * run again.
     *
     * Unfortunately, since the page tends to change quite a lot, calling the
     * script over and over again causes the page to take up a lot of memory and
     * freeze. In order to stop that from happening there's the timeout_trigger.
     * This adds a delay to the trigger, so if a script is triggered 50 times a
     * second it only counts the first one.
     *
     * This used to have two methods, one for each browser that this plugin was
     * made for. Unfortunately I had to get rid of one because Firefox doesn't
     * support it, and since the one that it DOES support seems to work ok in
     * Chrome I'll be using that from now on.
     */

    function timeout_trigger(callback, time) {
        var timeout = null;
        return function () {
            if (!timeout) {
                setTimeout(function () {
                    callback();
                    timeout = null;
                }, time);
            }
        };
    }

    function load_observer() {
        var trigger = timeout_trigger(main, 500),
            observer = new MutationObserver(trigger);

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        debug_console.log("HBCA: Observer loaded");
    }

    main();
    load_observer();
}());
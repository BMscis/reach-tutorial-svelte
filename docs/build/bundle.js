
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    /*! For license information please see reachsdk.min.js.LICENSE.txt */

    var reachsdk_min = createCommonjsModule(function (module, exports) {

    });

    const reachStore = writable({reach:{}});

    const playerHand = writable({handPlayed:"",timestamp:0});

    const showHands = writable({deploy:false,attach:false});

    const showAliceOutcome = writable({outCome:""});

    const aliceWaitingForResponse = writable(false);

    const showBobOutcome = writable({outCome:""});

    const bobWaitingForResponse = writable(false);

    const accountStore = writable({account:"",balance:0,container:{}});

    const handStore = (() => {
        const {subscribe, set} = playerHand;
        function action(value){
            function validate(value){
                set({handPlayed:value, timestamp:new Date().getTime()});
                return
                //a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
            }
            validate(value);
            return {
                update(value){
                    validate(value);
                }
            }
        }
        return [{subscribe}, action]
    });

    /* src/Views/Hand.svelte generated by Svelte v3.46.4 */
    const file$5 = "src/Views/Hand.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (14:4) {#each hands as hand}
    function create_each_block$2(ctx) {
    	let label;
    	let t0_value = /*hand*/ ctx[7] + "";
    	let t0;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			t0 = text(t0_value);
    			t1 = space();
    			input = element("input");
    			attr_dev(input, "type", "radio");
    			attr_dev(input, "name", "hand");
    			attr_dev(input, "id", /*hand*/ ctx[7]);
    			input.__value = /*hand*/ ctx[7];
    			input.value = input.__value;
    			/*$$binding_groups*/ ctx[6][0].push(input);
    			add_location(input, file$5, 15, 8, 413);
    			attr_dev(label, "for", /*hand*/ ctx[7]);
    			add_location(label, file$5, 14, 8, 380);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, t0);
    			append_dev(label, t1);
    			append_dev(label, input);
    			input.checked = input.__value === /*handPlayed*/ ctx[0];

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*handPlayed*/ 1) {
    				input.checked = input.__value === /*handPlayed*/ ctx[0];
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			/*$$binding_groups*/ ctx[6][0].splice(/*$$binding_groups*/ ctx[6][0].indexOf(input), 1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(14:4) {#each hands as hand}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let form;
    	let t0;
    	let br;
    	let t1;
    	let button;
    	let t3;
    	let p;
    	let t4;
    	let t5_value = /*$handStoreSubscribe*/ ctx[1].handPlayed + "";
    	let t5;
    	let mounted;
    	let dispose;
    	let each_value = /*hands*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			form = element("form");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			br = element("br");
    			t1 = space();
    			button = element("button");
    			button.textContent = "PLAY";
    			t3 = space();
    			p = element("p");
    			t4 = text("HandStore: ");
    			t5 = text(t5_value);
    			add_location(br, file$5, 18, 4, 527);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$5, 19, 4, 537);
    			add_location(form, file$5, 12, 0, 282);
    			add_location(p, file$5, 21, 0, 582);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(form, null);
    			}

    			append_dev(form, t0);
    			append_dev(form, br);
    			append_dev(form, t1);
    			append_dev(form, button);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t4);
    			append_dev(p, t5);

    			if (!mounted) {
    				dispose = listen_dev(
    					form,
    					"submit",
    					prevent_default(function () {
    						if (is_function(/*handStoreValidate*/ ctx[4](/*handPlayed*/ ctx[0]))) /*handStoreValidate*/ ctx[4](/*handPlayed*/ ctx[0]).apply(this, arguments);
    					}),
    					false,
    					true,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*hands, handPlayed*/ 5) {
    				each_value = /*hands*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(form, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*$handStoreSubscribe*/ 2 && t5_value !== (t5_value = /*$handStoreSubscribe*/ ctx[1].handPlayed + "")) set_data_dev(t5, t5_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $handStoreSubscribe;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Hand', slots, []);
    	let handPlayed = "";
    	const hands = ["ROCK", "PAPER", "SCISSORS"];
    	const [handStoreSubscribe, handStoreValidate] = handStore();
    	validate_store(handStoreSubscribe, 'handStoreSubscribe');
    	component_subscribe($$self, handStoreSubscribe, value => $$invalidate(1, $handStoreSubscribe = value));

    	onMount(() => {
    		
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Hand> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input_change_handler() {
    		handPlayed = this.__value;
    		$$invalidate(0, handPlayed);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		handStore,
    		showHands,
    		handPlayed,
    		hands,
    		handStoreSubscribe,
    		handStoreValidate,
    		$handStoreSubscribe
    	});

    	$$self.$inject_state = $$props => {
    		if ('handPlayed' in $$props) $$invalidate(0, handPlayed = $$props.handPlayed);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		handPlayed,
    		$handStoreSubscribe,
    		hands,
    		handStoreSubscribe,
    		handStoreValidate,
    		input_change_handler,
    		$$binding_groups
    	];
    }

    class Hand extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hand",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    // Automatically generated with Reach 0.1.8 (9e3e58f4)
    /* eslint-disable */
    const _version = '0.1.8';
    const _versionHash = '0.1.8 (9e3e58f4)';
    const _backendVersion = 10;

    function getExports(s) {
      s.reachStdlib;
      return {
        };
      }function _getEvents(s) {
      s.reachStdlib;
      return {
        };
      }function _getViews(s, viewlib) {
      const stdlib = s.reachStdlib;
      const ctc0 = stdlib.T_Address;
      const ctc1 = stdlib.T_UInt;
      const ctc2 = stdlib.T_Digest;
      
      return {
        infos: {
          },
        views: {
          1: [ctc0, ctc1, ctc1, ctc1],
          5: [ctc0, ctc1, ctc1, ctc0, ctc1, ctc1],
          7: [ctc0, ctc1, ctc1, ctc0, ctc1, ctc2, ctc1],
          9: [ctc0, ctc1, ctc1, ctc0, ctc1, ctc2, ctc1, ctc1]
          }
        };
      
      }function _getMaps(s) {
      const stdlib = s.reachStdlib;
      const ctc0 = stdlib.T_Tuple([]);
      return {
        mapDataTy: ctc0
        };
      }async function Alice$1(ctcTop, interact) {
      if (typeof(ctcTop) !== 'object' || ctcTop._initialize === undefined) {
        return Promise.reject(new Error(`The backend for Alice expects to receive a contract as its first argument.`));}
      if (typeof(interact) !== 'object') {
        return Promise.reject(new Error(`The backend for Alice expects to receive an interact object as its second argument.`));}
      const ctc = ctcTop._initialize();
      const stdlib = ctc.stdlib;
      const ctc0 = stdlib.T_UInt;
      const ctc1 = stdlib.T_Tuple([ctc0, ctc0]);
      const ctc2 = stdlib.T_Digest;
      const ctc3 = stdlib.T_Null;
      const ctc4 = stdlib.T_Address;
      
      
      const v292 = stdlib.protect(ctc0, interact.deadline, 'for Alice\'s interact field deadline');
      const v293 = stdlib.protect(ctc0, interact.wager, 'for Alice\'s interact field wager');
      
      const txn1 = await (ctc.sendrecv({
        args: [v293, v292],
        evt_cnt: 2,
        funcNum: 0,
        lct: stdlib.checkedBigNumberify('./index.rsh:49:9:dot', stdlib.UInt_max, 0),
        onlyIf: true,
        out_tys: [ctc0, ctc0],
        pay: [v293, []],
        sim_p: (async (txn1) => {
          const sim_r = { txns: [], mapRefs: [], maps: [] };
          stdlib.UInt_max;
          
          
          const {data: [v297, v298], secs: v300, time: v299, didSend: v56, from: v296 } = txn1;
          
          sim_r.txns.push({
            amt: v297,
            kind: 'to',
            tok: undefined
            });
          stdlib.add(v299, v298);
          sim_r.isHalt = false;
          
          return sim_r;
          }),
        soloSend: true,
        timeoutAt: undefined,
        tys: [ctc0, ctc0],
        waitIfNotPresent: false
        }));
      const {data: [v297, v298], secs: v300, time: v299, didSend: v56, from: v296 } = txn1;
      const v309 = stdlib.add(v299, v298);
      const txn2 = await (ctc.recv({
        didSend: false,
        evt_cnt: 0,
        funcNum: 1,
        out_tys: [],
        timeoutAt: ['time', v309],
        waitIfNotPresent: false
        }));
      if (txn2.didTimeout) {
        await (ctc.sendrecv({
          args: [v296, v297, v298, v309],
          evt_cnt: 0,
          funcNum: 2,
          lct: v299,
          onlyIf: true,
          out_tys: [],
          pay: [stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0), []],
          sim_p: (async (txn3) => {
            const sim_r = { txns: [], mapRefs: [], maps: [] };
            stdlib.UInt_max;
            
            sim_r.txns.push({
              amt: stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0),
              kind: 'to',
              tok: undefined
              });
            sim_r.txns.push({
              amt: v297,
              kind: 'from',
              to: v296,
              tok: undefined
              });
            sim_r.txns.push({
              kind: 'halt',
              tok: undefined
              });
            sim_r.isHalt = true;
            
            return sim_r;
            }),
          soloSend: false,
          timeoutAt: undefined,
          tys: [ctc4, ctc0, ctc0, ctc0],
          waitIfNotPresent: false
          }));
        stdlib.protect(ctc3, await interact.informTimeout(), {
          at: './index.rsh:41:29:application',
          fs: ['at ./index.rsh:40:9:application call to [unknown function] (defined at: ./index.rsh:40:27:function exp)', 'at reach standard library:192:8:application call to "after" (defined at: ./index.rsh:39:28:function exp)', 'at ./index.rsh:57:51:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
          msg: 'informTimeout',
          who: 'Alice'
          });
        
        return;
        
        }
      else {
        const {data: [], secs: v315, time: v314, didSend: v65, from: v313 } = txn2;
        const v317 = stdlib.add(v297, v297);
        let v318 = stdlib.checkedBigNumberify('./index.rsh:makeEnum', stdlib.UInt_max, 1);
        let v319 = v314;
        let v325 = v317;
        
        while (await (async () => {
          const v333 = stdlib.eq(v318, stdlib.checkedBigNumberify('./index.rsh:makeEnum', stdlib.UInt_max, 1));
          
          return v333;})()) {
          const v340 = stdlib.add(v319, v298);
          const v344 = stdlib.protect(ctc0, await interact.getHand(), {
            at: './index.rsh:65:42:application',
            fs: ['at ./index.rsh:64:15:application call to [unknown function] (defined at: ./index.rsh:64:19:function exp)'],
            msg: 'getHand',
            who: 'Alice'
            });
          const v345 = stdlib.protect(ctc0, await interact.random(), {
            at: 'reach standard library:53:31:application',
            fs: ['at ./index.rsh:66:56:application call to "makeCommitment" (defined at: reach standard library:52:8:function exp)', 'at ./index.rsh:64:15:application call to [unknown function] (defined at: ./index.rsh:64:19:function exp)'],
            msg: 'random',
            who: 'Alice'
            });
          const v346 = stdlib.digest(ctc1, [v345, v344]);
          
          const txn3 = await (ctc.sendrecv({
            args: [v296, v297, v298, v313, v325, v340, v346],
            evt_cnt: 1,
            funcNum: 4,
            lct: v319,
            onlyIf: true,
            out_tys: [ctc2],
            pay: [stdlib.checkedBigNumberify('./index.rsh:69:11:decimal', stdlib.UInt_max, 0), []],
            sim_p: (async (txn3) => {
              const sim_r = { txns: [], mapRefs: [], maps: [] };
              stdlib.UInt_max;
              
              
              const {data: [v349], secs: v351, time: v350, didSend: v91, from: v348 } = txn3;
              
              sim_r.txns.push({
                amt: stdlib.checkedBigNumberify('./index.rsh:69:11:decimal', stdlib.UInt_max, 0),
                kind: 'to',
                tok: undefined
                });
              const v352 = stdlib.addressEq(v296, v348);
              stdlib.assert(v352, {
                at: './index.rsh:69:11:dot',
                fs: [],
                msg: 'sender correct',
                who: 'Alice'
                });
              stdlib.add(v350, v298);
              sim_r.isHalt = false;
              
              return sim_r;
              }),
            soloSend: true,
            timeoutAt: ['time', v340],
            tys: [ctc4, ctc0, ctc0, ctc4, ctc0, ctc0, ctc2],
            waitIfNotPresent: false
            }));
          if (txn3.didTimeout) {
            const txn4 = await (ctc.sendrecv({
              args: [v296, v297, v298, v313, v325, v340],
              evt_cnt: 0,
              funcNum: 5,
              lct: v319,
              onlyIf: true,
              out_tys: [],
              pay: [stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0), []],
              sim_p: (async (txn4) => {
                const sim_r = { txns: [], mapRefs: [], maps: [] };
                stdlib.UInt_max;
                
                
                const {data: [], secs: v428, time: v427, didSend: v206, from: v426 } = txn4;
                
                sim_r.txns.push({
                  amt: stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0),
                  kind: 'to',
                  tok: undefined
                  });
                const v429 = stdlib.addressEq(v296, v426);
                const v430 = stdlib.addressEq(v313, v426);
                const v431 = v429 ? true : v430;
                stdlib.assert(v431, {
                  at: 'reach standard library:189:11:dot',
                  fs: ['at ./index.rsh:70:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                  msg: 'sender correct',
                  who: 'Alice'
                  });
                sim_r.txns.push({
                  amt: v325,
                  kind: 'from',
                  to: v313,
                  tok: undefined
                  });
                sim_r.txns.push({
                  kind: 'halt',
                  tok: undefined
                  });
                sim_r.isHalt = true;
                
                return sim_r;
                }),
              soloSend: false,
              timeoutAt: undefined,
              tys: [ctc4, ctc0, ctc0, ctc4, ctc0, ctc0],
              waitIfNotPresent: false
              }));
            const {data: [], secs: v428, time: v427, didSend: v206, from: v426 } = txn4;
            const v429 = stdlib.addressEq(v296, v426);
            const v430 = stdlib.addressEq(v313, v426);
            const v431 = v429 ? true : v430;
            stdlib.assert(v431, {
              at: 'reach standard library:189:11:dot',
              fs: ['at ./index.rsh:70:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
              msg: 'sender correct',
              who: 'Alice'
              });
            stdlib.protect(ctc3, await interact.informTimeout(), {
              at: './index.rsh:41:29:application',
              fs: ['at ./index.rsh:40:9:application call to [unknown function] (defined at: ./index.rsh:40:27:function exp)', 'at reach standard library:192:8:application call to "after" (defined at: ./index.rsh:39:28:function exp)', 'at ./index.rsh:70:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
              msg: 'informTimeout',
              who: 'Alice'
              });
            
            return;
            
            }
          else {
            const {data: [v349], secs: v351, time: v350, didSend: v91, from: v348 } = txn3;
            const v352 = stdlib.addressEq(v296, v348);
            stdlib.assert(v352, {
              at: './index.rsh:69:11:dot',
              fs: [],
              msg: 'sender correct',
              who: 'Alice'
              });
            const v359 = stdlib.add(v350, v298);
            const txn4 = await (ctc.recv({
              didSend: false,
              evt_cnt: 1,
              funcNum: 6,
              out_tys: [ctc0],
              timeoutAt: ['time', v359],
              waitIfNotPresent: false
              }));
            if (txn4.didTimeout) {
              const txn5 = await (ctc.sendrecv({
                args: [v296, v297, v298, v313, v325, v349, v359],
                evt_cnt: 0,
                funcNum: 7,
                lct: v350,
                onlyIf: true,
                out_tys: [],
                pay: [stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0), []],
                sim_p: (async (txn5) => {
                  const sim_r = { txns: [], mapRefs: [], maps: [] };
                  stdlib.UInt_max;
                  
                  
                  const {data: [], secs: v410, time: v409, didSend: v172, from: v408 } = txn5;
                  
                  sim_r.txns.push({
                    amt: stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0),
                    kind: 'to',
                    tok: undefined
                    });
                  const v411 = stdlib.addressEq(v296, v408);
                  const v412 = stdlib.addressEq(v313, v408);
                  const v413 = v411 ? true : v412;
                  stdlib.assert(v413, {
                    at: 'reach standard library:189:11:dot',
                    fs: ['at ./index.rsh:78:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                    msg: 'sender correct',
                    who: 'Alice'
                    });
                  sim_r.txns.push({
                    amt: v325,
                    kind: 'from',
                    to: v296,
                    tok: undefined
                    });
                  sim_r.txns.push({
                    kind: 'halt',
                    tok: undefined
                    });
                  sim_r.isHalt = true;
                  
                  return sim_r;
                  }),
                soloSend: false,
                timeoutAt: undefined,
                tys: [ctc4, ctc0, ctc0, ctc4, ctc0, ctc2, ctc0],
                waitIfNotPresent: false
                }));
              const {data: [], secs: v410, time: v409, didSend: v172, from: v408 } = txn5;
              const v411 = stdlib.addressEq(v296, v408);
              const v412 = stdlib.addressEq(v313, v408);
              const v413 = v411 ? true : v412;
              stdlib.assert(v413, {
                at: 'reach standard library:189:11:dot',
                fs: ['at ./index.rsh:78:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                msg: 'sender correct',
                who: 'Alice'
                });
              stdlib.protect(ctc3, await interact.informTimeout(), {
                at: './index.rsh:41:29:application',
                fs: ['at ./index.rsh:40:9:application call to [unknown function] (defined at: ./index.rsh:40:27:function exp)', 'at reach standard library:192:8:application call to "after" (defined at: ./index.rsh:39:28:function exp)', 'at ./index.rsh:78:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                msg: 'informTimeout',
                who: 'Alice'
                });
              
              return;
              
              }
            else {
              const {data: [v365], secs: v367, time: v366, didSend: v101, from: v364 } = txn4;
              const v368 = stdlib.addressEq(v313, v364);
              stdlib.assert(v368, {
                at: './index.rsh:77:9:dot',
                fs: [],
                msg: 'sender correct',
                who: 'Alice'
                });
              const v375 = stdlib.add(v366, v298);
              const txn5 = await (ctc.sendrecv({
                args: [v296, v297, v298, v313, v325, v349, v365, v375, v345, v344],
                evt_cnt: 2,
                funcNum: 8,
                lct: v366,
                onlyIf: true,
                out_tys: [ctc0, ctc0],
                pay: [stdlib.checkedBigNumberify('./index.rsh:85:11:decimal', stdlib.UInt_max, 0), []],
                sim_p: (async (txn5) => {
                  const sim_r = { txns: [], mapRefs: [], maps: [] };
                  stdlib.UInt_max;
                  
                  
                  const {data: [v380, v381], secs: v383, time: v382, didSend: v111, from: v379 } = txn5;
                  
                  sim_r.txns.push({
                    amt: stdlib.checkedBigNumberify('./index.rsh:85:11:decimal', stdlib.UInt_max, 0),
                    kind: 'to',
                    tok: undefined
                    });
                  const v384 = stdlib.addressEq(v296, v379);
                  stdlib.assert(v384, {
                    at: './index.rsh:85:11:dot',
                    fs: [],
                    msg: 'sender correct',
                    who: 'Alice'
                    });
                  const v385 = stdlib.digest(ctc1, [v380, v381]);
                  const v386 = stdlib.digestEq(v349, v385);
                  stdlib.assert(v386, {
                    at: 'reach standard library:58:17:application',
                    fs: ['at ./index.rsh:87:20:application call to "checkCommitment" (defined at: reach standard library:57:8:function exp)'],
                    msg: null,
                    who: 'Alice'
                    });
                  const v387 = stdlib.sub(stdlib.checkedBigNumberify('./index.rsh:7:18:decimal', stdlib.UInt_max, 4), v365);
                  const v388 = stdlib.add(v381, v387);
                  const v389 = stdlib.mod(v388, stdlib.checkedBigNumberify('./index.rsh:7:34:decimal', stdlib.UInt_max, 3));
                  const cv318 = v389;
                  const cv319 = v382;
                  
                  await (async () => {
                    const v318 = cv318;
                    const v319 = cv319;
                    
                    if (await (async () => {
                      const v333 = stdlib.eq(v318, stdlib.checkedBigNumberify('./index.rsh:makeEnum', stdlib.UInt_max, 1));
                      
                      return v333;})()) {
                      stdlib.add(v319, v298);
                      sim_r.isHalt = false;
                      }
                    else {
                      const v444 = stdlib.eq(v318, stdlib.checkedBigNumberify('./index.rsh:makeEnum', stdlib.UInt_max, 2));
                      const v447 = stdlib.mul(stdlib.checkedBigNumberify('./index.rsh:94:12:decimal', stdlib.UInt_max, 2), v297);
                      const v449 = v444 ? v296 : v313;
                      sim_r.txns.push({
                        amt: v447,
                        kind: 'from',
                        to: v449,
                        tok: undefined
                        });
                      sim_r.txns.push({
                        kind: 'halt',
                        tok: undefined
                        });
                      sim_r.isHalt = true;
                      }})();
                  return sim_r;
                  }),
                soloSend: true,
                timeoutAt: ['time', v375],
                tys: [ctc4, ctc0, ctc0, ctc4, ctc0, ctc2, ctc0, ctc0, ctc0, ctc0],
                waitIfNotPresent: false
                }));
              if (txn5.didTimeout) {
                const txn6 = await (ctc.sendrecv({
                  args: [v296, v297, v298, v313, v325, v349, v365, v375],
                  evt_cnt: 0,
                  funcNum: 9,
                  lct: v366,
                  onlyIf: true,
                  out_tys: [],
                  pay: [stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0), []],
                  sim_p: (async (txn6) => {
                    const sim_r = { txns: [], mapRefs: [], maps: [] };
                    stdlib.UInt_max;
                    
                    
                    const {data: [], secs: v392, time: v391, didSend: v138, from: v390 } = txn6;
                    
                    sim_r.txns.push({
                      amt: stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0),
                      kind: 'to',
                      tok: undefined
                      });
                    const v393 = stdlib.addressEq(v296, v390);
                    const v394 = stdlib.addressEq(v313, v390);
                    const v395 = v393 ? true : v394;
                    stdlib.assert(v395, {
                      at: 'reach standard library:189:11:dot',
                      fs: ['at ./index.rsh:86:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                      msg: 'sender correct',
                      who: 'Alice'
                      });
                    sim_r.txns.push({
                      amt: v325,
                      kind: 'from',
                      to: v313,
                      tok: undefined
                      });
                    sim_r.txns.push({
                      kind: 'halt',
                      tok: undefined
                      });
                    sim_r.isHalt = true;
                    
                    return sim_r;
                    }),
                  soloSend: false,
                  timeoutAt: undefined,
                  tys: [ctc4, ctc0, ctc0, ctc4, ctc0, ctc2, ctc0, ctc0],
                  waitIfNotPresent: false
                  }));
                const {data: [], secs: v392, time: v391, didSend: v138, from: v390 } = txn6;
                const v393 = stdlib.addressEq(v296, v390);
                const v394 = stdlib.addressEq(v313, v390);
                const v395 = v393 ? true : v394;
                stdlib.assert(v395, {
                  at: 'reach standard library:189:11:dot',
                  fs: ['at ./index.rsh:86:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                  msg: 'sender correct',
                  who: 'Alice'
                  });
                stdlib.protect(ctc3, await interact.informTimeout(), {
                  at: './index.rsh:41:29:application',
                  fs: ['at ./index.rsh:40:9:application call to [unknown function] (defined at: ./index.rsh:40:27:function exp)', 'at reach standard library:192:8:application call to "after" (defined at: ./index.rsh:39:28:function exp)', 'at ./index.rsh:86:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                  msg: 'informTimeout',
                  who: 'Alice'
                  });
                
                return;
                
                }
              else {
                const {data: [v380, v381], secs: v383, time: v382, didSend: v111, from: v379 } = txn5;
                const v384 = stdlib.addressEq(v296, v379);
                stdlib.assert(v384, {
                  at: './index.rsh:85:11:dot',
                  fs: [],
                  msg: 'sender correct',
                  who: 'Alice'
                  });
                const v385 = stdlib.digest(ctc1, [v380, v381]);
                const v386 = stdlib.digestEq(v349, v385);
                stdlib.assert(v386, {
                  at: 'reach standard library:58:17:application',
                  fs: ['at ./index.rsh:87:20:application call to "checkCommitment" (defined at: reach standard library:57:8:function exp)'],
                  msg: null,
                  who: 'Alice'
                  });
                const v387 = stdlib.sub(stdlib.checkedBigNumberify('./index.rsh:7:18:decimal', stdlib.UInt_max, 4), v365);
                const v388 = stdlib.add(v381, v387);
                const v389 = stdlib.mod(v388, stdlib.checkedBigNumberify('./index.rsh:7:34:decimal', stdlib.UInt_max, 3));
                const cv318 = v389;
                const cv319 = v382;
                const cv325 = v325;
                
                v318 = cv318;
                v319 = cv319;
                v325 = cv325;
                
                continue;}
              
              }
            
            }
          
          }
        stdlib.eq(v318, stdlib.checkedBigNumberify('./index.rsh:makeEnum', stdlib.UInt_max, 2));
        stdlib.mul(stdlib.checkedBigNumberify('./index.rsh:94:12:decimal', stdlib.UInt_max, 2), v297);
        stdlib.protect(ctc3, await interact.seeOutcome(v318), {
          at: './index.rsh:98:24:application',
          fs: ['at ./index.rsh:97:7:application call to [unknown function] (defined at: ./index.rsh:97:25:function exp)'],
          msg: 'seeOutcome',
          who: 'Alice'
          });
        
        return;
        }
      
      
      
      }async function Bob$1(ctcTop, interact) {
      if (typeof(ctcTop) !== 'object' || ctcTop._initialize === undefined) {
        return Promise.reject(new Error(`The backend for Bob expects to receive a contract as its first argument.`));}
      if (typeof(interact) !== 'object') {
        return Promise.reject(new Error(`The backend for Bob expects to receive an interact object as its second argument.`));}
      const ctc = ctcTop._initialize();
      const stdlib = ctc.stdlib;
      const ctc0 = stdlib.T_UInt;
      const ctc1 = stdlib.T_Null;
      const ctc2 = stdlib.T_Digest;
      const ctc3 = stdlib.T_Tuple([ctc0, ctc0]);
      const ctc4 = stdlib.T_Address;
      
      
      const txn1 = await (ctc.recv({
        didSend: false,
        evt_cnt: 2,
        funcNum: 0,
        out_tys: [ctc0, ctc0],
        timeoutAt: undefined,
        waitIfNotPresent: false
        }));
      const {data: [v297, v298], secs: v300, time: v299, didSend: v56, from: v296 } = txn1;
      const v309 = stdlib.add(v299, v298);
      stdlib.protect(ctc1, await interact.acceptWager(v297), {
        at: './index.rsh:54:25:application',
        fs: ['at ./index.rsh:53:11:application call to [unknown function] (defined at: ./index.rsh:53:15:function exp)'],
        msg: 'acceptWager',
        who: 'Bob'
        });
      
      const txn2 = await (ctc.sendrecv({
        args: [v296, v297, v298, v309],
        evt_cnt: 0,
        funcNum: 1,
        lct: v299,
        onlyIf: true,
        out_tys: [],
        pay: [v297, []],
        sim_p: (async (txn2) => {
          const sim_r = { txns: [], mapRefs: [], maps: [] };
          stdlib.UInt_max;
          
          
          const {data: [], secs: v315, time: v314, didSend: v65, from: v313 } = txn2;
          
          stdlib.add(v297, v297);
          sim_r.txns.push({
            amt: v297,
            kind: 'to',
            tok: undefined
            });
          const v318 = stdlib.checkedBigNumberify('./index.rsh:makeEnum', stdlib.UInt_max, 1);
          const v319 = v314;
          
          if (await (async () => {
            const v333 = stdlib.eq(v318, stdlib.checkedBigNumberify('./index.rsh:makeEnum', stdlib.UInt_max, 1));
            
            return v333;})()) {
            stdlib.add(v319, v298);
            sim_r.isHalt = false;
            }
          else {
            const v444 = stdlib.eq(v318, stdlib.checkedBigNumberify('./index.rsh:makeEnum', stdlib.UInt_max, 2));
            const v447 = stdlib.mul(stdlib.checkedBigNumberify('./index.rsh:94:12:decimal', stdlib.UInt_max, 2), v297);
            const v449 = v444 ? v296 : v313;
            sim_r.txns.push({
              amt: v447,
              kind: 'from',
              to: v449,
              tok: undefined
              });
            sim_r.txns.push({
              kind: 'halt',
              tok: undefined
              });
            sim_r.isHalt = true;
            }
          return sim_r;
          }),
        soloSend: true,
        timeoutAt: ['time', v309],
        tys: [ctc4, ctc0, ctc0, ctc0],
        waitIfNotPresent: false
        }));
      if (txn2.didTimeout) {
        await (ctc.sendrecv({
          args: [v296, v297, v298, v309],
          evt_cnt: 0,
          funcNum: 2,
          lct: v299,
          onlyIf: true,
          out_tys: [],
          pay: [stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0), []],
          sim_p: (async (txn3) => {
            const sim_r = { txns: [], mapRefs: [], maps: [] };
            stdlib.UInt_max;
            
            sim_r.txns.push({
              amt: stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0),
              kind: 'to',
              tok: undefined
              });
            sim_r.txns.push({
              amt: v297,
              kind: 'from',
              to: v296,
              tok: undefined
              });
            sim_r.txns.push({
              kind: 'halt',
              tok: undefined
              });
            sim_r.isHalt = true;
            
            return sim_r;
            }),
          soloSend: false,
          timeoutAt: undefined,
          tys: [ctc4, ctc0, ctc0, ctc0],
          waitIfNotPresent: false
          }));
        stdlib.protect(ctc1, await interact.informTimeout(), {
          at: './index.rsh:41:29:application',
          fs: ['at ./index.rsh:40:9:application call to [unknown function] (defined at: ./index.rsh:40:27:function exp)', 'at reach standard library:192:8:application call to "after" (defined at: ./index.rsh:39:28:function exp)', 'at ./index.rsh:57:51:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
          msg: 'informTimeout',
          who: 'Bob'
          });
        
        return;
        
        }
      else {
        const {data: [], secs: v315, time: v314, didSend: v65, from: v313 } = txn2;
        const v317 = stdlib.add(v297, v297);
        let v318 = stdlib.checkedBigNumberify('./index.rsh:makeEnum', stdlib.UInt_max, 1);
        let v319 = v314;
        let v325 = v317;
        
        while (await (async () => {
          const v333 = stdlib.eq(v318, stdlib.checkedBigNumberify('./index.rsh:makeEnum', stdlib.UInt_max, 1));
          
          return v333;})()) {
          const v340 = stdlib.add(v319, v298);
          const txn3 = await (ctc.recv({
            didSend: false,
            evt_cnt: 1,
            funcNum: 4,
            out_tys: [ctc2],
            timeoutAt: ['time', v340],
            waitIfNotPresent: false
            }));
          if (txn3.didTimeout) {
            const txn4 = await (ctc.sendrecv({
              args: [v296, v297, v298, v313, v325, v340],
              evt_cnt: 0,
              funcNum: 5,
              lct: v319,
              onlyIf: true,
              out_tys: [],
              pay: [stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0), []],
              sim_p: (async (txn4) => {
                const sim_r = { txns: [], mapRefs: [], maps: [] };
                stdlib.UInt_max;
                
                
                const {data: [], secs: v428, time: v427, didSend: v206, from: v426 } = txn4;
                
                sim_r.txns.push({
                  amt: stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0),
                  kind: 'to',
                  tok: undefined
                  });
                const v429 = stdlib.addressEq(v296, v426);
                const v430 = stdlib.addressEq(v313, v426);
                const v431 = v429 ? true : v430;
                stdlib.assert(v431, {
                  at: 'reach standard library:189:11:dot',
                  fs: ['at ./index.rsh:70:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                  msg: 'sender correct',
                  who: 'Bob'
                  });
                sim_r.txns.push({
                  amt: v325,
                  kind: 'from',
                  to: v313,
                  tok: undefined
                  });
                sim_r.txns.push({
                  kind: 'halt',
                  tok: undefined
                  });
                sim_r.isHalt = true;
                
                return sim_r;
                }),
              soloSend: false,
              timeoutAt: undefined,
              tys: [ctc4, ctc0, ctc0, ctc4, ctc0, ctc0],
              waitIfNotPresent: false
              }));
            const {data: [], secs: v428, time: v427, didSend: v206, from: v426 } = txn4;
            const v429 = stdlib.addressEq(v296, v426);
            const v430 = stdlib.addressEq(v313, v426);
            const v431 = v429 ? true : v430;
            stdlib.assert(v431, {
              at: 'reach standard library:189:11:dot',
              fs: ['at ./index.rsh:70:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
              msg: 'sender correct',
              who: 'Bob'
              });
            stdlib.protect(ctc1, await interact.informTimeout(), {
              at: './index.rsh:41:29:application',
              fs: ['at ./index.rsh:40:9:application call to [unknown function] (defined at: ./index.rsh:40:27:function exp)', 'at reach standard library:192:8:application call to "after" (defined at: ./index.rsh:39:28:function exp)', 'at ./index.rsh:70:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
              msg: 'informTimeout',
              who: 'Bob'
              });
            
            return;
            
            }
          else {
            const {data: [v349], secs: v351, time: v350, didSend: v91, from: v348 } = txn3;
            const v352 = stdlib.addressEq(v296, v348);
            stdlib.assert(v352, {
              at: './index.rsh:69:11:dot',
              fs: [],
              msg: 'sender correct',
              who: 'Bob'
              });
            const v359 = stdlib.add(v350, v298);
            const v363 = stdlib.protect(ctc0, await interact.getHand(), {
              at: './index.rsh:75:50:application',
              fs: ['at ./index.rsh:74:13:application call to [unknown function] (defined at: ./index.rsh:74:17:function exp)'],
              msg: 'getHand',
              who: 'Bob'
              });
            
            const txn4 = await (ctc.sendrecv({
              args: [v296, v297, v298, v313, v325, v349, v359, v363],
              evt_cnt: 1,
              funcNum: 6,
              lct: v350,
              onlyIf: true,
              out_tys: [ctc0],
              pay: [stdlib.checkedBigNumberify('./index.rsh:77:9:decimal', stdlib.UInt_max, 0), []],
              sim_p: (async (txn4) => {
                const sim_r = { txns: [], mapRefs: [], maps: [] };
                stdlib.UInt_max;
                
                
                const {data: [v365], secs: v367, time: v366, didSend: v101, from: v364 } = txn4;
                
                sim_r.txns.push({
                  amt: stdlib.checkedBigNumberify('./index.rsh:77:9:decimal', stdlib.UInt_max, 0),
                  kind: 'to',
                  tok: undefined
                  });
                const v368 = stdlib.addressEq(v313, v364);
                stdlib.assert(v368, {
                  at: './index.rsh:77:9:dot',
                  fs: [],
                  msg: 'sender correct',
                  who: 'Bob'
                  });
                stdlib.add(v366, v298);
                sim_r.isHalt = false;
                
                return sim_r;
                }),
              soloSend: true,
              timeoutAt: ['time', v359],
              tys: [ctc4, ctc0, ctc0, ctc4, ctc0, ctc2, ctc0, ctc0],
              waitIfNotPresent: false
              }));
            if (txn4.didTimeout) {
              const txn5 = await (ctc.sendrecv({
                args: [v296, v297, v298, v313, v325, v349, v359],
                evt_cnt: 0,
                funcNum: 7,
                lct: v350,
                onlyIf: true,
                out_tys: [],
                pay: [stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0), []],
                sim_p: (async (txn5) => {
                  const sim_r = { txns: [], mapRefs: [], maps: [] };
                  stdlib.UInt_max;
                  
                  
                  const {data: [], secs: v410, time: v409, didSend: v172, from: v408 } = txn5;
                  
                  sim_r.txns.push({
                    amt: stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0),
                    kind: 'to',
                    tok: undefined
                    });
                  const v411 = stdlib.addressEq(v296, v408);
                  const v412 = stdlib.addressEq(v313, v408);
                  const v413 = v411 ? true : v412;
                  stdlib.assert(v413, {
                    at: 'reach standard library:189:11:dot',
                    fs: ['at ./index.rsh:78:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                    msg: 'sender correct',
                    who: 'Bob'
                    });
                  sim_r.txns.push({
                    amt: v325,
                    kind: 'from',
                    to: v296,
                    tok: undefined
                    });
                  sim_r.txns.push({
                    kind: 'halt',
                    tok: undefined
                    });
                  sim_r.isHalt = true;
                  
                  return sim_r;
                  }),
                soloSend: false,
                timeoutAt: undefined,
                tys: [ctc4, ctc0, ctc0, ctc4, ctc0, ctc2, ctc0],
                waitIfNotPresent: false
                }));
              const {data: [], secs: v410, time: v409, didSend: v172, from: v408 } = txn5;
              const v411 = stdlib.addressEq(v296, v408);
              const v412 = stdlib.addressEq(v313, v408);
              const v413 = v411 ? true : v412;
              stdlib.assert(v413, {
                at: 'reach standard library:189:11:dot',
                fs: ['at ./index.rsh:78:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                msg: 'sender correct',
                who: 'Bob'
                });
              stdlib.protect(ctc1, await interact.informTimeout(), {
                at: './index.rsh:41:29:application',
                fs: ['at ./index.rsh:40:9:application call to [unknown function] (defined at: ./index.rsh:40:27:function exp)', 'at reach standard library:192:8:application call to "after" (defined at: ./index.rsh:39:28:function exp)', 'at ./index.rsh:78:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                msg: 'informTimeout',
                who: 'Bob'
                });
              
              return;
              
              }
            else {
              const {data: [v365], secs: v367, time: v366, didSend: v101, from: v364 } = txn4;
              const v368 = stdlib.addressEq(v313, v364);
              stdlib.assert(v368, {
                at: './index.rsh:77:9:dot',
                fs: [],
                msg: 'sender correct',
                who: 'Bob'
                });
              const v375 = stdlib.add(v366, v298);
              const txn5 = await (ctc.recv({
                didSend: false,
                evt_cnt: 2,
                funcNum: 8,
                out_tys: [ctc0, ctc0],
                timeoutAt: ['time', v375],
                waitIfNotPresent: false
                }));
              if (txn5.didTimeout) {
                const txn6 = await (ctc.sendrecv({
                  args: [v296, v297, v298, v313, v325, v349, v365, v375],
                  evt_cnt: 0,
                  funcNum: 9,
                  lct: v366,
                  onlyIf: true,
                  out_tys: [],
                  pay: [stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0), []],
                  sim_p: (async (txn6) => {
                    const sim_r = { txns: [], mapRefs: [], maps: [] };
                    stdlib.UInt_max;
                    
                    
                    const {data: [], secs: v392, time: v391, didSend: v138, from: v390 } = txn6;
                    
                    sim_r.txns.push({
                      amt: stdlib.checkedBigNumberify('reach standard library:189:11:decimal', stdlib.UInt_max, 0),
                      kind: 'to',
                      tok: undefined
                      });
                    const v393 = stdlib.addressEq(v296, v390);
                    const v394 = stdlib.addressEq(v313, v390);
                    const v395 = v393 ? true : v394;
                    stdlib.assert(v395, {
                      at: 'reach standard library:189:11:dot',
                      fs: ['at ./index.rsh:86:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                      msg: 'sender correct',
                      who: 'Bob'
                      });
                    sim_r.txns.push({
                      amt: v325,
                      kind: 'from',
                      to: v313,
                      tok: undefined
                      });
                    sim_r.txns.push({
                      kind: 'halt',
                      tok: undefined
                      });
                    sim_r.isHalt = true;
                    
                    return sim_r;
                    }),
                  soloSend: false,
                  timeoutAt: undefined,
                  tys: [ctc4, ctc0, ctc0, ctc4, ctc0, ctc2, ctc0, ctc0],
                  waitIfNotPresent: false
                  }));
                const {data: [], secs: v392, time: v391, didSend: v138, from: v390 } = txn6;
                const v393 = stdlib.addressEq(v296, v390);
                const v394 = stdlib.addressEq(v313, v390);
                const v395 = v393 ? true : v394;
                stdlib.assert(v395, {
                  at: 'reach standard library:189:11:dot',
                  fs: ['at ./index.rsh:86:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                  msg: 'sender correct',
                  who: 'Bob'
                  });
                stdlib.protect(ctc1, await interact.informTimeout(), {
                  at: './index.rsh:41:29:application',
                  fs: ['at ./index.rsh:40:9:application call to [unknown function] (defined at: ./index.rsh:40:27:function exp)', 'at reach standard library:192:8:application call to "after" (defined at: ./index.rsh:39:28:function exp)', 'at ./index.rsh:86:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
                  msg: 'informTimeout',
                  who: 'Bob'
                  });
                
                return;
                
                }
              else {
                const {data: [v380, v381], secs: v383, time: v382, didSend: v111, from: v379 } = txn5;
                const v384 = stdlib.addressEq(v296, v379);
                stdlib.assert(v384, {
                  at: './index.rsh:85:11:dot',
                  fs: [],
                  msg: 'sender correct',
                  who: 'Bob'
                  });
                const v385 = stdlib.digest(ctc3, [v380, v381]);
                const v386 = stdlib.digestEq(v349, v385);
                stdlib.assert(v386, {
                  at: 'reach standard library:58:17:application',
                  fs: ['at ./index.rsh:87:20:application call to "checkCommitment" (defined at: reach standard library:57:8:function exp)'],
                  msg: null,
                  who: 'Bob'
                  });
                const v387 = stdlib.sub(stdlib.checkedBigNumberify('./index.rsh:7:18:decimal', stdlib.UInt_max, 4), v365);
                const v388 = stdlib.add(v381, v387);
                const v389 = stdlib.mod(v388, stdlib.checkedBigNumberify('./index.rsh:7:34:decimal', stdlib.UInt_max, 3));
                const cv318 = v389;
                const cv319 = v382;
                const cv325 = v325;
                
                v318 = cv318;
                v319 = cv319;
                v325 = cv325;
                
                continue;}
              
              }
            
            }
          
          }
        stdlib.eq(v318, stdlib.checkedBigNumberify('./index.rsh:makeEnum', stdlib.UInt_max, 2));
        stdlib.mul(stdlib.checkedBigNumberify('./index.rsh:94:12:decimal', stdlib.UInt_max, 2), v297);
        stdlib.protect(ctc1, await interact.seeOutcome(v318), {
          at: './index.rsh:98:24:application',
          fs: ['at ./index.rsh:97:7:application call to [unknown function] (defined at: ./index.rsh:97:25:function exp)'],
          msg: 'seeOutcome',
          who: 'Bob'
          });
        
        return;
        }
      
      
      
      }const _ALGO = {
      ABI: {
        impure: [],
        pure: [],
        sigs: []
        },
      appApproval: `BSAQAAEFUAkgCAcoeAKAAQQDWDAmAwEAAQEAIjUAMRhBBWsqZEkiWzUBIQZbNQI2GgAXSUEAByI1BCM1BgA2GgEXNhoCFzUENhoDNQVJJAxAAoVJIQcMQAFsSSEGDEAA+EkhBAxAAHAhBBJEIQQ0ARJENARJIhJMNAISEUQoZClkUEk1A1cwIDX/gASiBWaOsDIGNAMhC1sPRDQDVwAgMQASNP8xABIRRDQDJVtJQQAMsbIII7IQNP+yB7MiSCKxsggjshAyCbIJMgqyB7MiSDEZJBJEQgSPSCEENAESRDQESSISTDQCEhFEKGQpZFBJNQNXACA1/zQFIls1/jQFIQZbNf2ABDUaKtA0/hZQNP0WULAyBjQDIQtbDEQ0/zEAEkQ0A1dYIDT+FjT9FlABEkQ0/zQDIQVbNAMhCFs0A1cwIDT9IQw0AyEJWwkIIQ0YMgY0AyVbQgOOSCEHNAESRDQESSISTDQCEhFEKGQpZFBJNQNXACA1/4AE4huzqbAyBjQDIQlbD0Q0/zEAEjQDVzAgMQASEUQ0AyVbSUEADLGyCCOyEDT/sgezIkgisbIII7IQMgmyCTIKsgezIkgxGSQSREIDoUmBBgxAAKJIIQc0ARJENARJIhJMNAISEUQoZClkUEk1A1cAIDX/NAMhBVs1/jQDIQhbNf00A1cwIDX8NAMlWzX7NANXWCA1+jQFFzX5gARw7e96NPkWULAyBjQDIQlbDEQ0/DEAEkQyBjT9CDX4NP80/hZQNP0WUDT8UDT7FlA0+lA0+RZQNPgWUChLAVcAf2cpSwFXfwlnSCEENQEyBjUCMRkiEkRCAvhIJDQBEkQ0BEkiEkw0AhIRRChkSTUDVzAgNf+ABMyZklywMgY0AyEOWw9ENANXACAxABI0/zEAEhFENAMlW0lBAAyxsggjshA0/7IHsyJIIrGyCCOyEDIJsgkyCrIHsyJIMRkkEkRCAo9JIQoMQAD4SSENDEAAmUkhDAxAAJFIJDQBEkQ0BEkiEkw0AhIRRChkSTUDVwAgNf80AyEFWzX+NAMhCFs1/TQDVzAgNfw0AyVbNfs0BTX6gAQ4sCMtNPpQsDIGNAMhDlsMRDT/MQASRDIGNP0INfk0/zT+FlA0/RZQNPxQNPsWUDT6UDT5FlAoSwFXAH9nKUsBV38BZ0ghBzUBMgY1AjEZIhJEQgHpSEgjNAESRDQESSISTDQCEhFEKGQ1A4AEQbFATbAyBjQDIQ9bD0Q0AyEFW0lBAA+xsggjshA0A1cAILIHsyJIIrGyCCOyEDIJsgkyCrIHsyJIMRkkEkRCAZBJIwxAAGdIIzQBEkQ0BEkiEkw0AhIRRChkSTUDIQVbNf+ABJqLkXSwMgY0AyEPWwxENP9JQQAdNABJIwg1AExLATgIEkQjSwE4EBJEMgpLATgHEkRINANXACA0/zQDIQhbMQAjMgY0/0kIQgCjSCI0ARJENARJIhJMNAISEUQ0BSJbNf80BSEGWzX+gASs0R/DNP8WUDT+FlCwgaCNBklBAB00AEkjCDUATEsBOAgSRCNLATgQEkQyCksBOAcSREg0/0lBAB00AEkjCDUATEsBOAgSRCNLATgQEkQyCksBOAcSREgyBjT+CDX9MQA0/xZQNP4WUDT9FlAoSwFXADhnSCM1ATIGNQIxGSISREIAgDX/Nf41/TX8Nfs1+jX5NP0jEkEAMzT+NPsINfg0+TT6FlA0+xZQNPxQNP8WUDT4FlAoSwFXAGBnSCQ1ATIGNQIxGSISREIAOCEKNPoLSUEAFLGyCCOyEDT8NPk0/SEKEk2yB7MiSCKxsggjshAyCbIJMgqyB7MiSDEZJBJEQgAAKjQBFjQCFlBnNAZBAAqABBUffHU0B1CwNABJIwgyBBJEMRYSRCNDMRkiEkQiNQEiNQJC/8s=`,
      appClear: `BQ==`,
      extraPages: 0,
      mapDataKeys: 0,
      mapDataSize: 0,
      stateKeys: 2,
      stateSize: 136,
      unsupported: [],
      version: 9,
      warnings: []
      };
    const _ETH = {
      ABI: `[
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v297",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v298",
                "type": "uint256"
              }
            ],
            "internalType": "struct T1",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "internalType": "struct T2",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "stateMutability": "payable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "msg",
        "type": "uint256"
      }
    ],
    "name": "ReachError",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v297",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v298",
                "type": "uint256"
              }
            ],
            "internalType": "struct T1",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "indexed": false,
        "internalType": "struct T2",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_e0",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_e1",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_e2",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v349",
                "type": "uint256"
              }
            ],
            "internalType": "struct T10",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "indexed": false,
        "internalType": "struct T11",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_e4",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_e5",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v365",
                "type": "uint256"
              }
            ],
            "internalType": "struct T13",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "indexed": false,
        "internalType": "struct T14",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_e6",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_e7",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v380",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v381",
                "type": "uint256"
              }
            ],
            "internalType": "struct T15",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "indexed": false,
        "internalType": "struct T16",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_e8",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_e9",
    "type": "event"
  },
  {
    "stateMutability": "payable",
    "type": "fallback"
  },
  {
    "inputs": [],
    "name": "_reachCreationTime",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "_reachCurrentState",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "_reachCurrentTime",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_m1",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_m2",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v349",
                "type": "uint256"
              }
            ],
            "internalType": "struct T10",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "internalType": "struct T11",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_m4",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_m5",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v365",
                "type": "uint256"
              }
            ],
            "internalType": "struct T13",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "internalType": "struct T14",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_m6",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_m7",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "v380",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "v381",
                "type": "uint256"
              }
            ],
            "internalType": "struct T15",
            "name": "msg",
            "type": "tuple"
          }
        ],
        "internalType": "struct T16",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_m8",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "time",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "msg",
            "type": "bool"
          }
        ],
        "internalType": "struct T7",
        "name": "_a",
        "type": "tuple"
      }
    ],
    "name": "_reach_m9",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
]`,
      Bytecode: `0x608060405260405162001b0d38038062001b0d833981016040819052620000269162000248565b600080805543600355604080516020810190915290815260408051835181526020808501518051828401520151918101919091527f80c0078efe412e5091172e0df54decefb16131f320816d23b64aede2bf8e9e4b9060600160405180910390a16020820151516200009c903414600762000141565b6020808301510151620000b09043620002a8565b81526040805160808082018352600060208084018281528486018381526060808701858152338089528b860180515186525186015184528a5182526001968790554390965588518086019690965292518589015290519084015251828401528451808303909301835260a0909101909352805191926200013792600292909101906200016b565b505050506200030c565b81620001675760405163100960cb60e01b81526004810182905260240160405180910390fd5b5050565b8280546200017990620002cf565b90600052602060002090601f0160209004810192826200019d5760008555620001e8565b82601f10620001b857805160ff1916838001178555620001e8565b82800160010185558215620001e8579182015b82811115620001e8578251825591602001919060010190620001cb565b50620001f6929150620001fa565b5090565b5b80821115620001f65760008155600101620001fb565b604080519081016001600160401b03811182821017156200024257634e487b7160e01b600052604160045260246000fd5b60405290565b600081830360608112156200025c57600080fd5b6200026662000211565b835181526040601f19830112156200027d57600080fd5b6200028762000211565b60208581015182526040909501518582015293810193909352509092915050565b60008219821115620002ca57634e487b7160e01b600052601160045260246000fd5b500190565b600181811c90821680620002e457607f821691505b602082108114156200030657634e487b7160e01b600052602260045260246000fd5b50919050565b6117f1806200031c6000396000f3fe60806040526004361061009a5760003560e01c80638e314769116100615780638e31476914610115578063980b6eac14610128578063a209ad4e1461013b578063ab53f2c61461014e578063bf2c5b2414610171578063de7369981461018457005b80631e93b0f1146100a35780632c10a159146100c75780637eea518c146100da57806383230757146100ed5780638328d4c41461010257005b366100a157005b005b3480156100af57600080fd5b506003545b6040519081526020015b60405180910390f35b6100a16100d53660046113d1565b610197565b6100a16100e83660046113d1565b61032c565b3480156100f957600080fd5b506001546100b4565b6100a16101103660046113f4565b6104a8565b6100a16101233660046113d1565b6106cc565b6100a16101363660046113d1565b610865565b6100a16101493660046113d1565b610b0a565b34801561015a57600080fd5b50610163610d52565b6040516100be929190611406565b6100a161017f3660046113d1565b610def565b6100a16101923660046113d1565b610f84565b6101a760016000541460096110d8565b6101c1813515806101ba57506001548235145b600a6110d8565b6000808055600280546101d390611463565b80601f01602080910402602001604051908101604052809291908181526020018280546101ff90611463565b801561024c5780601f106102215761010080835404028352916020019161024c565b820191906000526020600020905b81548152906001019060200180831161022f57829003601f168201915b505050505080602001905181019061026491906114b4565b905061027781606001514310600b6110d8565b7f79ca1a789d797004bc78dff9632d64e202e102f2d008dcc20c5a645ef7d4a7d1826040516102a6919061152d565b60405180910390a16102bf8160200151341460086110d8565b6102c761128a565b815181516001600160a01b039091169052602080830180518351830152604080850151845190910152825133606090910152818301805160019052514392019190915251610315908061156d565b602082015160400152610327816110fd565b505050565b61033c600160005414600d6110d8565b6103568135158061034f57506001548235145b600e6110d8565b60008080556002805461036890611463565b80601f016020809104026020016040519081016040528092919081815260200182805461039490611463565b80156103e15780601f106103b6576101008083540402835291602001916103e1565b820191906000526020600020905b8154815290600101906020018083116103c457829003601f168201915b50505050508060200190518101906103f991906114b4565b905061040d8160600151431015600f6110d8565b7f82e152e8b1d7e41adffbddbd5b2fe2e130356df9b7ab7d06526a80d7888af3e18260405161043c919061152d565b60405180910390a16104503415600c6110d8565b805160208201516040516001600160a01b039092169181156108fc0291906000818181858888f1935050505015801561048d573d6000803e3d6000fd5b50600080805560018190556104a4906002906112e3565b5050565b6104b860096000541460276110d8565b6104d2813515806104cb57506001548235145b60286110d8565b6000808055600280546104e490611463565b80601f016020809104026020016040519081016040528092919081815260200182805461051090611463565b801561055d5780601f106105325761010080835404028352916020019161055d565b820191906000526020600020905b81548152906001019060200180831161054057829003601f168201915b50505050508060200190518101906105759190611585565b90506105888160e00151431060296110d8565b604080518335815260208085013590820152838201358183015290517f41b6d8e223fb0a5cfe68af9f34b07a5a94b63517841457ccfc53fb18b8e41fde9181900360600190a16105da341560246110d8565b80516105f2906001600160a01b0316331460256110d8565b6040805161063e9161061891602080870135928701359101918252602082015260400190565b6040516020818303038152906040528051906020012060001c8260a001511460266110d8565b61064661128a565b815181516001600160a01b0391821690526020808401518351909101526040808401518351909101526060808401518351921691015260c082015160039061068f906004611631565b61069d90604086013561156d565b6106a79190611648565b60208083018051929092528151439101526080830151905160400152610327816110fd565b6106dc60056000541460176110d8565b6106f6813515806106ef57506001548235145b60186110d8565b60008080556002805461070890611463565b80601f016020809104026020016040519081016040528092919081815260200182805461073490611463565b80156107815780601f1061075657610100808354040283529160200191610781565b820191906000526020600020905b81548152906001019060200180831161076457829003601f168201915b5050505050806020019051810190610799919061166a565b90506107ad8160a0015143101560196110d8565b7f9cdba579557d44a893ea7929682d6795d48dd5c40dc981d852842d4b18914de8826040516107dc919061152d565b60405180910390a16107f0341560156110d8565b8051610824906001600160a01b0316331461081a5760608201516001600160a01b0316331461081d565b60015b60166110d8565b80606001516001600160a01b03166108fc82608001519081150290604051600060405180830381858888f1935050505015801561048d573d6000803e3d6000fd5b610875600760005414601c6110d8565b61088f8135158061088857506001548235145b601d6110d8565b6000808055600280546108a190611463565b80601f01602080910402602001604051908101604052809291908181526020018280546108cd90611463565b801561091a5780601f106108ef5761010080835404028352916020019161091a565b820191906000526020600020905b8154815290600101906020018083116108fd57829003601f168201915b505050505080602001905181019061093291906116fe565b905061094a6040518060200160405280600081525090565b61095b8260c001514310601e6110d8565b6040805184358152602080860135908201527f47a1195f23e4ca8f87a7a744a702eeb3eb5b0d56dae31e23931e0349a611c709910160405180910390a16109a43415601a6110d8565b60608201516109bf906001600160a01b03163314601b6110d8565b60408201516109ce904361156d565b81526040805161010081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e081019190915282516001600160a01b0390811682526020808501518184015260408086015181850152606080870151909316928401929092526080808601519084015260a080860151908401528581013560c0840152835160e08401526009600055436001559051610adf9183910160006101008201905060018060a01b038084511683526020840151602084015260408401516040840152806060850151166060840152506080830151608083015260a083015160a083015260c083015160c083015260e083015160e083015292915050565b60405160208183030381529060405260029080519060200190610b03929190611320565b5050505050565b610b1a60056000541460126110d8565b610b3481351580610b2d57506001548235145b60136110d8565b600080805560028054610b4690611463565b80601f0160208091040260200160405190810160405280929190818152602001828054610b7290611463565b8015610bbf5780601f10610b9457610100808354040283529160200191610bbf565b820191906000526020600020905b815481529060010190602001808311610ba257829003601f168201915b5050505050806020019051810190610bd7919061166a565b9050610bef6040518060200160405280600081525090565b610c008260a00151431060146110d8565b6040805184358152602080860135908201527f7d7741a24b17d1850d95beda5136388f520bc575ba9499f2f40fdfa7647ad82f910160405180910390a1610c49341560106110d8565b8151610c61906001600160a01b0316331460116110d8565b6040820151610c70904361156d565b81526040805160e081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c081019190915282516001600160a01b039081168083526020808601518185019081526040808801518187019081526060808a015187168189019081526080808c0151818b019081528d88013560a0808d019182528d5160c0808f0191825260076000554360015589519b8c019c909c529851978a0197909752945193880193909352905190971696850196909652945190830152925191810191909152905160e082015261010001610adf565b600060606000546002808054610d6790611463565b80601f0160208091040260200160405190810160405280929190818152602001828054610d9390611463565b8015610de05780601f10610db557610100808354040283529160200191610de0565b820191906000526020600020905b815481529060010190602001808311610dc357829003601f168201915b50505050509050915091509091565b610dff60076000541460216110d8565b610e1981351580610e1257506001548235145b60226110d8565b600080805560028054610e2b90611463565b80601f0160208091040260200160405190810160405280929190818152602001828054610e5790611463565b8015610ea45780601f10610e7957610100808354040283529160200191610ea4565b820191906000526020600020905b815481529060010190602001808311610e8757829003601f168201915b5050505050806020019051810190610ebc91906116fe565b9050610ed08160c0015143101560236110d8565b7fba16100ad25f3c6798bc3b7e9ca316fb231388e6fa4444c0f477e2a4336514e082604051610eff919061152d565b60405180910390a1610f133415601f6110d8565b8051610f47906001600160a01b03163314610f3d5760608201516001600160a01b03163314610f40565b60015b60206110d8565b805160808201516040516001600160a01b039092169181156108fc0291906000818181858888f1935050505015801561048d573d6000803e3d6000fd5b610f94600960005414602c6110d8565b610fae81351580610fa757506001548235145b602d6110d8565b600080805560028054610fc090611463565b80601f0160208091040260200160405190810160405280929190818152602001828054610fec90611463565b80156110395780601f1061100e57610100808354040283529160200191611039565b820191906000526020600020905b81548152906001019060200180831161101c57829003601f168201915b50505050508060200190518101906110519190611585565b90506110658160e00151431015602e6110d8565b7fb764c356a899e639c4043e82fb6274894baac6d84c74f3b3ae78d8f4b22b000382604051611094919061152d565b60405180910390a16110a83415602a6110d8565b8051610824906001600160a01b031633146110d25760608201516001600160a01b031633146110d5565b60015b602b5b816104a45760405163100960cb60e01b81526004810182905260240160405180910390fd5b60408051602081019091526000815260208201515160011415611225578151604001516020808401510151611132919061156d565b81526040805160c081018252600080825260208201819052918101829052606081018290526080810182905260a08101919091528251516001600160a01b039081168083528451602090810151818501908152865160409081015181870190815288516060908101518716818901908152858b01518401516080808b019182528b5160a0808d019182526005600055436001558751998a019a909a529651958801959095529251918601919091525190951690830152925191810191909152905160c082015260e0016040516020818303038152906040526002908051906020019061121f929190611320565b50505050565b60208201515160021461123d57815160600151611241565b8151515b6001600160a01b03166108fc8360000151602001516002611262919061179c565b6040518115909202916000818181858888f1935050505015801561048d573d6000803e3d6000fd5b6040805160c0810182526000918101828152606082018390526080820183905260a082019290925290819081526020016112de60405180606001604052806000815260200160008152602001600081525090565b905290565b5080546112ef90611463565b6000825580601f106112ff575050565b601f01602090049060005260206000209081019061131d91906113a4565b50565b82805461132c90611463565b90600052602060002090601f01602090048101928261134e5760008555611394565b82601f1061136757805160ff1916838001178555611394565b82800160010185558215611394579182015b82811115611394578251825591602001919060010190611379565b506113a09291506113a4565b5090565b5b808211156113a057600081556001016113a5565b6000604082840312156113cb57600080fd5b50919050565b6000604082840312156113e357600080fd5b6113ed83836113b9565b9392505050565b6000606082840312156113cb57600080fd5b82815260006020604081840152835180604085015260005b8181101561143a5785810183015185820160600152820161141e565b8181111561144c576000606083870101525b50601f01601f191692909201606001949350505050565b600181811c9082168061147757607f821691505b602082108114156113cb57634e487b7160e01b600052602260045260246000fd5b80516001600160a01b03811681146114af57600080fd5b919050565b6000608082840312156114c657600080fd5b6040516080810181811067ffffffffffffffff821117156114f757634e487b7160e01b600052604160045260246000fd5b60405261150383611498565b81526020830151602082015260408301516040820152606083015160608201528091505092915050565b8135815260408101602083013580151580821461154957600080fd5b806020850152505092915050565b634e487b7160e01b600052601160045260246000fd5b6000821982111561158057611580611557565b500190565b600061010080838503121561159957600080fd5b6040519081019067ffffffffffffffff821181831017156115ca57634e487b7160e01b600052604160045260246000fd5b816040526115d784611498565b815260208401516020820152604084015160408201526115f960608501611498565b60608201526080840151608082015260a084015160a082015260c084015160c082015260e084015160e0820152809250505092915050565b60008282101561164357611643611557565b500390565b60008261166557634e487b7160e01b600052601260045260246000fd5b500690565b600060c0828403121561167c57600080fd5b60405160c0810181811067ffffffffffffffff821117156116ad57634e487b7160e01b600052604160045260246000fd5b6040526116b983611498565b815260208301516020820152604083015160408201526116db60608401611498565b60608201526080830151608082015260a083015160a08201528091505092915050565b600060e0828403121561171057600080fd5b60405160e0810181811067ffffffffffffffff8211171561174157634e487b7160e01b600052604160045260246000fd5b60405261174d83611498565b8152602083015160208201526040830151604082015261176f60608401611498565b60608201526080830151608082015260a083015160a082015260c083015160c08201528091505092915050565b60008160001904831182151516156117b6576117b6611557565b50029056fea2646970667358221220631a52c990b11c9ff520b264c19364d04fda899f37b6774826a994d8ebc9afc364736f6c63430008090033`,
      BytecodeLen: 6925,
      Which: `oD`,
      version: 6,
      views: {
        }
      };
    const _stateSourceMap = {
      1: {
        at: './index.rsh:51:11:after expr stmt semicolon',
        fs: [],
        msg: null,
        who: 'Module'
        },
      2: {
        at: 'reach standard library:191:11:after expr stmt semicolon',
        fs: ['at ./index.rsh:57:51:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
        msg: null,
        who: 'Module'
        },
      4: {
        at: './index.rsh:95:11:after expr stmt semicolon',
        fs: [],
        msg: null,
        who: 'Module'
        },
      5: {
        at: './index.rsh:62:13:after expr stmt semicolon',
        fs: [],
        msg: null,
        who: 'Module'
        },
      6: {
        at: 'reach standard library:191:11:after expr stmt semicolon',
        fs: ['at ./index.rsh:70:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
        msg: null,
        who: 'Module'
        },
      7: {
        at: './index.rsh:71:13:after expr stmt semicolon',
        fs: [],
        msg: null,
        who: 'Module'
        },
      8: {
        at: 'reach standard library:191:11:after expr stmt semicolon',
        fs: ['at ./index.rsh:78:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
        msg: null,
        who: 'Module'
        },
      9: {
        at: './index.rsh:79:13:after expr stmt semicolon',
        fs: [],
        msg: null,
        who: 'Module'
        },
      10: {
        at: 'reach standard library:191:11:after expr stmt semicolon',
        fs: ['at ./index.rsh:86:53:application call to "closeTo" (defined at: reach standard library:187:8:function exp)'],
        msg: null,
        who: 'Module'
        }
      };
    const _Connectors = {
      ALGO: _ALGO,
      ETH: _ETH
      };
    const _Participants = {
      "Alice": Alice$1,
      "Bob": Bob$1
      };
    const _APIs = {
      };

    var backend = /*#__PURE__*/Object.freeze({
        __proto__: null,
        _version: _version,
        _versionHash: _versionHash,
        _backendVersion: _backendVersion,
        getExports: getExports,
        _getEvents: _getEvents,
        _getViews: _getViews,
        _getMaps: _getMaps,
        Alice: Alice$1,
        Bob: Bob$1,
        _stateSourceMap: _stateSourceMap,
        _Connectors: _Connectors,
        _Participants: _Participants,
        _APIs: _APIs
    });

    const handToInt = { 'ROCK': 0, 'PAPER': 1, 'SCISSORS': 2 };
    //const intToOutcome = ['Bob wins!', 'Draw!', 'Alice wins!'];
    class Player {
        constructor() {
            this.reach = get_store_value(reachStore).reach;
            this.accountStore = get_store_value(accountStore);
            console.log("_____________PLAYER______________");
        }
        lastTimeStamp = 0
        show = (val) => {
            switch (val) {
                case true:
                    this.constructor.name == "Deployer" ?
                        showHands.set({ deploy: true, attach: false }) :
                        showHands.set({ deploy: false, attach: true });
                    break;

                case false:
                    showHands.set({ deploy: false, attach: false });
                    this.constructor.name == "Deployer" ?
                        aliceWaitingForResponse.set(true) :
                        bobWaitingForResponse.set(true);
                    break;
            }
        }
        getHand = async () => {
            this.show(true);

            console.log("getHand ", this.constructor.name);
            let res = await this.play();

            this.show(false);
            console.log("getHand: ", this.constructor.name);
            return res
        }
        play = () => new Promise(resolve => {
            playerHand.subscribe((value) => {
                console.log("PLAYER playerHand: ", value);
                if (value.handPlayed.length > 0 && value.timestamp != this.lastTimeStamp) {
                    resolve(handToInt[value.handPlayed]);
                }
            });
        })
        random() {
            console.log("THIS IS SO RANDOM");
            return this.reach.hasRandom.random()
        }
        seeOutcome(i) {
            console.log("OutComeIS: ", intToOutcome[i]);
        }
        informTimeout(deadline) {
            console.log("InformTimeOutIs: ", deadline);
        }
        getAccountBalance = () => {
            ethereum
                .request({
                    method: 'eth_getBalance',
                    params: [this.accountStore.account],
                })
                .then((getBalanceResult) => {
                    accountStore.set({
                        account: this.accountStore.account,
                        balance: reach.formatCurrency(getBalanceResult, 4),
                        container: this.accountStore.container
                    });
                });
        }
    }
    class Deployer extends Player {
        constructor(wager) {
            super();
            this.wager = this.reach.parseCurrency(wager);
            this.deadline = { ETH: 10, ALGO: 100, CFX: 1000 }[this.reach.connector];
            this.intToOutcome = ['You lose!', 'It\'s Draw!', 'You win!'];
            console.log("_____________DEPLOYER______________");
        }
        async deployContract() {
            let ctc = await this.accountStore.container.contract(backend);
            Alice$1(ctc, this);
            const ctcInfoStr = JSON.stringify(await ctc.getInfo(), null, 2);
            console.log("::::::::deploy contract:::::::::::::");
            return ctcInfoStr
        }
        seeOutcome(i) {
            aliceWaitingForResponse.set(false);
            showAliceOutcome.set({ outCome: this.intToOutcome[i] });
            this.getAccountBalance();
        }
    }
    class Attacher extends Player {
        constructor() {
            super();
            this.intToOutcome = ['You Win!', 'It\'s Draw!', 'You Lose!'];
            console.log("_____________ATTACHER______________");
        }
        async attach(ctcInfoStr) {
            console.log("::::::::attach contract:::::::::::::");
            let ctc = await this.accountStore.container.contract(backend, JSON.parse(ctcInfoStr));
            await Bob$1(ctc, this);
            console.log("ATTACHER - DONE: ");
        }
        async acceptWager(wagerAtomic) {
            console.log("::::::::wage:::::::::::::");
            this.reach.formatCurrency(wagerAtomic, 4);
        }
        seeOutcome(i) {
            bobWaitingForResponse.set(false);
            showBobOutcome.set({ outCome: this.intToOutcome[i] });
            this.getAccountBalance();
        }
    }

    /* src/Views/Bob.svelte generated by Svelte v3.46.4 */

    const { console: console_1$3 } = globals;

    const file$4 = "src/Views/Bob.svelte";

    // (43:0) {#if showHand}
    function create_if_block_2$2(ctx) {
    	let hand;
    	let current;
    	hand = new Hand({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(hand.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(hand, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hand.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hand.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hand, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(43:0) {#if showHand}",
    		ctx
    	});

    	return block;
    }

    // (46:0) {#if bobWaiting}
    function create_if_block_1$3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Waiting for response";
    			add_location(p, file$4, 46, 4, 1295);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(46:0) {#if bobWaiting}",
    		ctx
    	});

    	return block;
    }

    // (49:0) {#if outCome.length > 0}
    function create_if_block$3(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(/*outCome*/ ctx[1]);
    			t1 = space();
    			button = element("button");
    			button.textContent = "play again";
    			add_location(p, file$4, 49, 4, 1358);
    			add_location(button, file$4, 50, 4, 1379);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*outCome*/ 2) set_data_dev(t0, /*outCome*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(49:0) {#if outCome.length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let form;
    	let label;
    	let textarea;
    	let t0;
    	let button;
    	let t2;
    	let t3;
    	let t4;
    	let if_block2_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*showHand*/ ctx[2] && create_if_block_2$2(ctx);
    	let if_block1 = /*bobWaiting*/ ctx[3] && create_if_block_1$3(ctx);
    	let if_block2 = /*outCome*/ ctx[1].length > 0 && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			form = element("form");
    			label = element("label");
    			textarea = element("textarea");
    			t0 = space();
    			button = element("button");
    			button.textContent = "ATTACH CONTRACT";
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr_dev(textarea, "type", "text");
    			attr_dev(textarea, "name", "attach");
    			attr_dev(textarea, "id", "attach");
    			add_location(textarea, file$4, 38, 8, 1086);
    			attr_dev(label, "for", "attach");
    			add_location(label, file$4, 37, 4, 1057);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$4, 40, 4, 1183);
    			add_location(form, file$4, 36, 0, 1002);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, label);
    			append_dev(label, textarea);
    			set_input_value(textarea, /*attachedContract*/ ctx[0]);
    			append_dev(form, t0);
    			append_dev(form, button);
    			insert_dev(target, t2, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t4, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[6]),
    					listen_dev(form, "submit", prevent_default(/*attachToContract*/ ctx[4]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*attachedContract*/ 1) {
    				set_input_value(textarea, /*attachedContract*/ ctx[0]);
    			}

    			if (/*showHand*/ ctx[2]) {
    				if (if_block0) {
    					if (dirty & /*showHand*/ 4) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2$2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t3.parentNode, t3);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*bobWaiting*/ ctx[3]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1$3(ctx);
    					if_block1.c();
    					if_block1.m(t4.parentNode, t4);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*outCome*/ ctx[1].length > 0) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$3(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (detaching) detach_dev(t2);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t4);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Bob', slots, []);
    	let attachedContract;
    	let bobPlayer;
    	let outCome = "";
    	let showHand;
    	let bobWaiting = false;

    	async function attachToContract() {
    		bobPlayer = new Attacher();
    		await bobPlayer.attach(attachedContract);
    		console.log("+++++++++++++++++++BOB VIEW");
    	}

    	const resetContract = () => {
    		contract = undefined;
    		$$invalidate(1, outCome = "");
    		return;
    	};

    	onMount(() => {
    		return [
    			showBobOutcome.subscribe(value => {
    				$$invalidate(1, outCome = value.outCome);
    			}),
    			showHands.subscribe(value => {
    				$$invalidate(2, showHand = value.attach);
    			}),
    			bobWaitingForResponse.subscribe(value => {
    				$$invalidate(3, bobWaiting = value);
    			})
    		];
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$3.warn(`<Bob> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		attachedContract = this.value;
    		$$invalidate(0, attachedContract);
    	}

    	const click_handler = () => {
    		resetContract();
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		Hand,
    		Attacher,
    		bobWaitingForResponse,
    		showBobOutcome,
    		showHands,
    		attachedContract,
    		bobPlayer,
    		outCome,
    		showHand,
    		bobWaiting,
    		attachToContract,
    		resetContract
    	});

    	$$self.$inject_state = $$props => {
    		if ('attachedContract' in $$props) $$invalidate(0, attachedContract = $$props.attachedContract);
    		if ('bobPlayer' in $$props) bobPlayer = $$props.bobPlayer;
    		if ('outCome' in $$props) $$invalidate(1, outCome = $$props.outCome);
    		if ('showHand' in $$props) $$invalidate(2, showHand = $$props.showHand);
    		if ('bobWaiting' in $$props) $$invalidate(3, bobWaiting = $$props.bobWaiting);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		attachedContract,
    		outCome,
    		showHand,
    		bobWaiting,
    		attachToContract,
    		resetContract,
    		textarea_input_handler,
    		click_handler
    	];
    }

    class Bob extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bob",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/Views/Alice.svelte generated by Svelte v3.46.4 */

    const { console: console_1$2 } = globals;

    const file$3 = "src/Views/Alice.svelte";

    // (38:0) {#if !contract}
    function create_if_block_4(ctx) {
    	let form;
    	let label;
    	let t0;
    	let input;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element("form");
    			label = element("label");
    			t0 = text("Set Wager\n    ");
    			input = element("input");
    			t1 = space();
    			button = element("button");
    			button.textContent = "WAGE";
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "wager");
    			add_location(input, file$3, 40, 4, 1128);
    			attr_dev(label, "for", "wager");
    			add_location(label, file$3, 39, 4, 1095);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$3, 42, 4, 1198);
    			add_location(form, file$3, 38, 0, 1032);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, label);
    			append_dev(label, t0);
    			append_dev(label, input);
    			set_input_value(input, /*wager*/ ctx[0]);
    			append_dev(form, t1);
    			append_dev(form, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[7]),
    					listen_dev(form, "submit", prevent_default(/*submit_handler*/ ctx[8]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*wager*/ 1 && to_number(input.value) !== /*wager*/ ctx[0]) {
    				set_input_value(input, /*wager*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(38:0) {#if !contract}",
    		ctx
    	});

    	return block;
    }

    // (46:0) {#if contract}
    function create_if_block_3(ctx) {
    	let blockquote;
    	let t1;
    	let code;
    	let t2;

    	const block = {
    		c: function create() {
    			blockquote = element("blockquote");
    			blockquote.textContent = "Copy this.";
    			t1 = space();
    			code = element("code");
    			t2 = text(/*contract*/ ctx[1]);
    			add_location(blockquote, file$3, 46, 0, 1263);
    			add_location(code, file$3, 47, 0, 1299);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, blockquote, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, code, anchor);
    			append_dev(code, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*contract*/ 2) set_data_dev(t2, /*contract*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(blockquote);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(code);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(46:0) {#if contract}",
    		ctx
    	});

    	return block;
    }

    // (50:0) {#if showHand}
    function create_if_block_2$1(ctx) {
    	let hand;
    	let current;
    	hand = new Hand({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(hand.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(hand, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hand.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hand.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hand, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(50:0) {#if showHand}",
    		ctx
    	});

    	return block;
    }

    // (53:0) {#if aliceWaiting}
    function create_if_block_1$2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Waiting for response";
    			add_location(p, file$3, 53, 4, 1388);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(53:0) {#if aliceWaiting}",
    		ctx
    	});

    	return block;
    }

    // (56:0) {#if outCome.length > 0}
    function create_if_block$2(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(/*outCome*/ ctx[2]);
    			t1 = space();
    			button = element("button");
    			button.textContent = "play again";
    			add_location(p, file$3, 56, 4, 1451);
    			add_location(button, file$3, 57, 4, 1472);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*outCome*/ 4) set_data_dev(t0, /*outCome*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(56:0) {#if outCome.length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let if_block4_anchor;
    	let current;
    	let if_block0 = !/*contract*/ ctx[1] && create_if_block_4(ctx);
    	let if_block1 = /*contract*/ ctx[1] && create_if_block_3(ctx);
    	let if_block2 = /*showHand*/ ctx[3] && create_if_block_2$1(ctx);
    	let if_block3 = /*aliceWaiting*/ ctx[4] && create_if_block_1$2(ctx);
    	let if_block4 = /*outCome*/ ctx[2].length > 0 && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if (if_block4) if_block4.c();
    			if_block4_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			if (if_block4) if_block4.m(target, anchor);
    			insert_dev(target, if_block4_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!/*contract*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*contract*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*showHand*/ ctx[3]) {
    				if (if_block2) {
    					if (dirty & /*showHand*/ 8) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_2$1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(t2.parentNode, t2);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*aliceWaiting*/ ctx[4]) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_1$2(ctx);
    					if_block3.c();
    					if_block3.m(t3.parentNode, t3);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*outCome*/ ctx[2].length > 0) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block$2(ctx);
    					if_block4.c();
    					if_block4.m(if_block4_anchor.parentNode, if_block4_anchor);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (if_block4) if_block4.d(detaching);
    			if (detaching) detach_dev(if_block4_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Alice', slots, []);
    	let wager;
    	let contract;
    	let alicePlayer;
    	let outCome = "";
    	let showHand;
    	let aliceWaiting = false;

    	async function deployContract() {
    		alicePlayer = new Deployer(wager);
    		$$invalidate(1, contract = await alicePlayer.deployContract());
    		console.log("+++++++++++++++++++ALICE VIEW");
    	}

    	const resetContract = () => {
    		$$invalidate(1, contract = undefined);
    		$$invalidate(2, outCome = "");
    		return;
    	};

    	onMount(() => {
    		return [
    			showAliceOutcome.subscribe(value => {
    				$$invalidate(2, outCome = value.outCome);
    			}),
    			showHands.subscribe(value => {
    				$$invalidate(3, showHand = value.deploy);
    			}),
    			aliceWaitingForResponse.subscribe(value => {
    				$$invalidate(4, aliceWaiting = value);
    			})
    		];
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<Alice> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		wager = to_number(this.value);
    		$$invalidate(0, wager);
    	}

    	const submit_handler = () => {
    		deployContract();
    	};

    	const click_handler = () => {
    		resetContract();
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		Hand,
    		Deployer,
    		aliceWaitingForResponse,
    		showAliceOutcome,
    		showHands,
    		wager,
    		contract,
    		alicePlayer,
    		outCome,
    		showHand,
    		aliceWaiting,
    		deployContract,
    		resetContract
    	});

    	$$self.$inject_state = $$props => {
    		if ('wager' in $$props) $$invalidate(0, wager = $$props.wager);
    		if ('contract' in $$props) $$invalidate(1, contract = $$props.contract);
    		if ('alicePlayer' in $$props) alicePlayer = $$props.alicePlayer;
    		if ('outCome' in $$props) $$invalidate(2, outCome = $$props.outCome);
    		if ('showHand' in $$props) $$invalidate(3, showHand = $$props.showHand);
    		if ('aliceWaiting' in $$props) $$invalidate(4, aliceWaiting = $$props.aliceWaiting);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		wager,
    		contract,
    		outCome,
    		showHand,
    		aliceWaiting,
    		deployContract,
    		resetContract,
    		input_input_handler,
    		submit_handler,
    		click_handler
    	];
    }

    class Alice extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Alice",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/Views/Participants.svelte generated by Svelte v3.46.4 */
    const file$2 = "src/Views/Participants.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (11:8) {#each participants as party}
    function create_each_block$1(ctx) {
    	let option;
    	let t_value = /*party*/ ctx[3] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*party*/ ctx[3];
    			option.value = option.__value;
    			add_location(option, file$2, 11, 12, 324);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(11:8) {#each participants as party}",
    		ctx
    	});

    	return block;
    }

    // (18:34) 
    function create_if_block_1$1(ctx) {
    	let bob;
    	let current;
    	bob = new Bob({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(bob.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(bob, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bob.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bob.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(bob, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(18:34) ",
    		ctx
    	});

    	return block;
    }

    // (16:0) {#if selectedPlayer == "Alice"}
    function create_if_block$1(ctx) {
    	let alice;
    	let current;
    	alice = new Alice({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(alice.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(alice, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(alice.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(alice.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(alice, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(16:0) {#if selectedPlayer == \\\"Alice\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let form;
    	let label;
    	let t1;
    	let select;
    	let t2;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*participants*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const if_block_creators = [create_if_block$1, create_if_block_1$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*selectedPlayer*/ ctx[0] == "Alice") return 0;
    		if (/*selectedPlayer*/ ctx[0] == "Bob") return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			form = element("form");
    			label = element("label");
    			label.textContent = "Select Player";
    			t1 = space();
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(label, "for", "player");
    			add_location(label, file$2, 8, 4, 179);
    			attr_dev(select, "id", "player");
    			if (/*selectedPlayer*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[2].call(select));
    			add_location(select, file$2, 9, 4, 225);
    			add_location(form, file$2, 7, 0, 168);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, label);
    			append_dev(form, t1);
    			append_dev(form, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*selectedPlayer*/ ctx[0]);
    			insert_dev(target, t2, anchor);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[2]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*participants*/ 2) {
    				each_value = /*participants*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*selectedPlayer, participants*/ 3) {
    				select_option(select, /*selectedPlayer*/ ctx[0]);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t2);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Participants', slots, []);
    	let selectedPlayer = "";
    	const participants = ["Alice", "Bob"];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Participants> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		selectedPlayer = select_value(this);
    		$$invalidate(0, selectedPlayer);
    		$$invalidate(1, participants);
    	}

    	$$self.$capture_state = () => ({ Bob, Alice, selectedPlayer, participants });

    	$$self.$inject_state = $$props => {
    		if ('selectedPlayer' in $$props) $$invalidate(0, selectedPlayer = $$props.selectedPlayer);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [selectedPlayer, participants, select_change_handler];
    }

    class Participants extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Participants",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Views/WalletView.svelte generated by Svelte v3.46.4 */

    const { console: console_1$1 } = globals;
    const file$1 = "src/Views/WalletView.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (81:27) 
    function create_if_block_1(ctx) {
    	let t0;
    	let div5;
    	let div2;
    	let span4;
    	let div0;
    	let span0;
    	let t2;
    	let span1;
    	let t3;
    	let t4;
    	let div1;
    	let span2;
    	let t6;
    	let span3;
    	let t7;
    	let t8;
    	let div3;
    	let span5;
    	let h2;
    	let t10;
    	let form;
    	let label;
    	let t11;
    	let input;
    	let t12;
    	let button;
    	let t14;
    	let div4;
    	let current;
    	let mounted;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block
    	};

    	handle_promise(/*loadDefault*/ ctx[7](), info);
    	let if_block = /*accountBalance*/ ctx[2] > 0 && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			info.block.c();
    			t0 = space();
    			div5 = element("div");
    			div2 = element("div");
    			span4 = element("span");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Name:";
    			t2 = space();
    			span1 = element("span");
    			t3 = text(/*accountName*/ ctx[1]);
    			t4 = space();
    			div1 = element("div");
    			span2 = element("span");
    			span2.textContent = "Balance:";
    			t6 = space();
    			span3 = element("span");
    			t7 = text(/*accountBalance*/ ctx[2]);
    			t8 = space();
    			div3 = element("div");
    			span5 = element("span");
    			h2 = element("h2");
    			h2.textContent = "FUND ACCOUNT";
    			t10 = space();
    			form = element("form");
    			label = element("label");
    			t11 = text("Fund Account\n                ");
    			input = element("input");
    			t12 = space();
    			button = element("button");
    			button.textContent = "FUND";
    			t14 = space();
    			div4 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(span0, "class", "svelte-1yatwl7");
    			add_location(span0, file$1, 88, 20, 2720);
    			attr_dev(span1, "class", "svelte-1yatwl7");
    			add_location(span1, file$1, 89, 20, 2760);
    			add_location(div0, file$1, 87, 16, 2694);
    			attr_dev(span2, "class", "svelte-1yatwl7");
    			add_location(span2, file$1, 92, 20, 2852);
    			attr_dev(span3, "class", "svelte-1yatwl7");
    			add_location(span3, file$1, 93, 20, 2895);
    			add_location(div1, file$1, 91, 16, 2826);
    			attr_dev(span4, "class", "svelte-1yatwl7");
    			add_location(span4, file$1, 86, 12, 2671);
    			add_location(div2, file$1, 85, 8, 2652);
    			add_location(h2, file$1, 99, 16, 3032);
    			attr_dev(span5, "class", "svelte-1yatwl7");
    			add_location(span5, file$1, 98, 12, 3009);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "id", "input-funds");
    			add_location(input, file$1, 103, 16, 3212);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$1, 109, 16, 3424);
    			attr_dev(label, "for", "input-funds");
    			add_location(label, file$1, 102, 16, 3158);
    			add_location(form, file$1, 101, 12, 3086);
    			add_location(div3, file$1, 97, 8, 2991);
    			add_location(div4, file$1, 113, 8, 3526);
    			add_location(div5, file$1, 84, 4, 2637);
    		},
    		m: function mount(target, anchor) {
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => t0.parentNode;
    			info.anchor = t0;
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div2);
    			append_dev(div2, span4);
    			append_dev(span4, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t2);
    			append_dev(div0, span1);
    			append_dev(span1, t3);
    			append_dev(span4, t4);
    			append_dev(span4, div1);
    			append_dev(div1, span2);
    			append_dev(div1, t6);
    			append_dev(div1, span3);
    			append_dev(span3, t7);
    			append_dev(div5, t8);
    			append_dev(div5, div3);
    			append_dev(div3, span5);
    			append_dev(span5, h2);
    			append_dev(div3, t10);
    			append_dev(div3, form);
    			append_dev(form, label);
    			append_dev(label, t11);
    			append_dev(label, input);
    			set_input_value(input, /*fundAmount*/ ctx[4]);
    			append_dev(label, t12);
    			append_dev(label, button);
    			append_dev(div5, t14);
    			append_dev(div5, div4);
    			if (if_block) if_block.m(div4, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[11]),
    					listen_dev(
    						input,
    						"input",
    						function () {
    							if (is_function(console.log(/*fundAmount*/ ctx[4]))) console.log(/*fundAmount*/ ctx[4]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(form, "submit", prevent_default(/*submit_handler_1*/ ctx[12]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (!current || dirty & /*accountName*/ 2) set_data_dev(t3, /*accountName*/ ctx[1]);
    			if (!current || dirty & /*accountBalance*/ 4) set_data_dev(t7, /*accountBalance*/ ctx[2]);

    			if (dirty & /*fundAmount*/ 16 && to_number(input.value) !== /*fundAmount*/ ctx[4]) {
    				set_input_value(input, /*fundAmount*/ ctx[4]);
    			}

    			if (/*accountBalance*/ ctx[2] > 0) {
    				if (if_block) {
    					if (dirty & /*accountBalance*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div4, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div5);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(81:27) ",
    		ctx
    	});

    	return block;
    }

    // (70:0) {#if nextStep == false}
    function create_if_block(ctx) {
    	let form;
    	let label;
    	let t0;
    	let select;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;
    	let each_value = /*blockchain*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			form = element("form");
    			label = element("label");
    			t0 = text("Select Blockchain\n        ");
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			button = element("button");
    			button.textContent = "SUBMIT";
    			attr_dev(select, "id", "blockchain");
    			if (/*selectedBlockchain*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[9].call(select));
    			add_location(select, file$1, 72, 8, 2297);
    			attr_dev(label, "for", "blockchain");
    			add_location(label, file$1, 71, 8, 2247);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$1, 78, 8, 2494);
    			add_location(form, file$1, 70, 4, 2182);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, label);
    			append_dev(label, t0);
    			append_dev(label, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*selectedBlockchain*/ ctx[0]);
    			append_dev(form, t1);
    			append_dev(form, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[9]),
    					listen_dev(form, "submit", prevent_default(/*submit_handler*/ ctx[10]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*blockchain*/ 32) {
    				each_value = /*blockchain*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*selectedBlockchain, blockchain*/ 33) {
    				select_option(select, /*selectedBlockchain*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(70:0) {#if nextStep == false}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>     import { onMount }
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>     import { onMount }",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>     import { onMount }
    function create_then_block(ctx) {
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(1:0) <script>     import { onMount }",
    		ctx
    	});

    	return block;
    }

    // (82:26)          <h1>ASP</h1>     {/await}
    function create_pending_block(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "ASP";
    			add_location(h1, file$1, 82, 8, 2607);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(82:26)          <h1>ASP</h1>     {/await}",
    		ctx
    	});

    	return block;
    }

    // (115:12) {#if accountBalance > 0}
    function create_if_block_2(ctx) {
    	let participants;
    	let current;
    	participants = new Participants({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(participants.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(participants, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(participants.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(participants.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(participants, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(115:12) {#if accountBalance > 0}",
    		ctx
    	});

    	return block;
    }

    // (74:12) {#each blockchain as chain}
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*chain*/ ctx[16] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*chain*/ ctx[16];
    			option.value = option.__value;
    			add_location(option, file$1, 74, 16, 2410);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(74:12) {#each blockchain as chain}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*nextStep*/ ctx[3] == false) return 0;
    		if (/*nextStep*/ ctx[3] == true) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WalletView', slots, []);
    	let blockchain = ["ETH", "ALGO"];
    	let selectedBlockchain = "";
    	let accountName = "";
    	let accountBalance = 0;
    	let myAccount = {};

    	//const { standardUnit } = reach;
    	//const defaults = { defaultFundAmt: "10", defaultWager: "3", standardUnit };
    	let nextStep = false;

    	let fundAmount = 0;
    	let canFund = false;

    	const handleSubmit = () => {
    		console.log("selected: ", selectedBlockchain);
    		$$invalidate(3, nextStep = true);
    	};

    	const getBalance = async balAcc => {
    		let balAtomic = await reach.balanceOf(balAcc);
    		let bal = reach.formatCurrency(balAtomic, 4);
    		return bal;
    	};

    	async function loadDefault() {
    		const reach = reachsdk_min.loadStdlib(selectedBlockchain);
    		reachStore.set({ reach });
    		const acc = await reach.getDefaultAccount();
    		const bal = await getBalance(acc);
    		myAccount = acc;

    		accountStore.set({
    			account: acc.networkAccount.address,
    			balance: bal,
    			container: acc
    		});

    		canFund = await reach.canFundFromFaucet();
    		console.log("CAN FUND: ", canFund);
    	}

    	async function fundAccount() {
    		try {
    			await reach.fundFromFaucet(get_store_value(accountStore).container, reach.parseCurrency(fundAmount));

    			accountStore.set({
    				account: myAccount.networkAccount.address,
    				balance: await getBalance(myAccount),
    				container: myAccount
    			});
    		} catch(error) {
    			console.log(error);
    		}
    	} //this.setState({ view: "DeployerOrAttacher" });

    	onMount(() => {
    		return accountStore.subscribe(value => {
    			$$invalidate(1, accountName = value.account);
    			$$invalidate(2, accountBalance = value.balance);
    			console.log(value);
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<WalletView> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		selectedBlockchain = select_value(this);
    		$$invalidate(0, selectedBlockchain);
    		$$invalidate(5, blockchain);
    	}

    	const submit_handler = () => {
    		handleSubmit();
    	};

    	function input_input_handler() {
    		fundAmount = to_number(this.value);
    		$$invalidate(4, fundAmount);
    	}

    	const submit_handler_1 = () => {
    		fundAccount();
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		get: get_store_value,
    		loadStdlib: reachsdk_min.loadStdlib,
    		Participants,
    		accountStore,
    		reachStore,
    		blockchain,
    		selectedBlockchain,
    		accountName,
    		accountBalance,
    		myAccount,
    		nextStep,
    		fundAmount,
    		canFund,
    		handleSubmit,
    		getBalance,
    		loadDefault,
    		fundAccount
    	});

    	$$self.$inject_state = $$props => {
    		if ('blockchain' in $$props) $$invalidate(5, blockchain = $$props.blockchain);
    		if ('selectedBlockchain' in $$props) $$invalidate(0, selectedBlockchain = $$props.selectedBlockchain);
    		if ('accountName' in $$props) $$invalidate(1, accountName = $$props.accountName);
    		if ('accountBalance' in $$props) $$invalidate(2, accountBalance = $$props.accountBalance);
    		if ('myAccount' in $$props) myAccount = $$props.myAccount;
    		if ('nextStep' in $$props) $$invalidate(3, nextStep = $$props.nextStep);
    		if ('fundAmount' in $$props) $$invalidate(4, fundAmount = $$props.fundAmount);
    		if ('canFund' in $$props) canFund = $$props.canFund;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		selectedBlockchain,
    		accountName,
    		accountBalance,
    		nextStep,
    		fundAmount,
    		blockchain,
    		handleSubmit,
    		loadDefault,
    		fundAccount,
    		select_change_handler,
    		submit_handler,
    		input_input_handler,
    		submit_handler_1
    	];
    }

    class WalletView extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WalletView",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.4 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let walletview;
    	let current;
    	walletview = new WalletView({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(walletview.$$.fragment);
    			add_location(main, file, 24, 0, 735);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(walletview, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(walletview.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(walletview.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(walletview);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function loginOrCreate() {
    	try {
    		const accounts = await myAlgoWallet.connect();
    		const addresses = accounts.map(acc => acc.address);

    		// const acc = await reach.getDefaultAccount();
    		// const balAtomic = await reach.balanceOf(acc);
    		// const bal = reach.formatCurrency(balAtomic, 4);
    		//accountStore.set({ account: accounts, balance: addresses });
    		console.log("ACC: ", accounts);

    		console.log("ADD: ", addresses);
    	} catch(err) {
    		console.log(err); // if (await reach.canFundFromFaucet()) {
    		console.log("ALGO FAILED BRO");
    	}
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ WalletView, loginOrCreate });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
var timer;
var nextRefresh = moment().add(5, 'minutes');
var admin = false;

jQuery(document).ready(function() {
	updateOnScreenDateTime();
	setInterval(function() {
		if (nextRefresh && nextRefresh.isSameOrBefore()) {
			refreshDisplay();
		}
		updateOnScreenDateTime();
	}, 1000);

	// Blank on weekends
	if (moment().isoWeekday() > 6) {
		nextRefresh = moment({hour: 0, minute: 0, second: 0}).day(1);
		return;
	}

	// Blank in the evenings
	if (moment().isBetween(moment({hour: 21}), moment({hour: 24})) ) {
		nextRefresh = moment({hour: 24})
		return;
	}

	// Blank in the mornings
	if (moment().isBetween(moment({hour: 0}), moment({hour: 7}))) {
		nextRefresh = moment({hour: 7})
		return;
	}

	// Refresh early is display will become out of date.
	if (jQuery('#refresh').val()) {
		const refresh = moment(jQuery('#refresh').val());
		if (refresh.isBefore(moment().add(5, 'minutes'))) {
			nextRefresh = refresh;
		}
	}

	console.log(`Next display refresh: ${nextRefresh.format('YYYY-MM-DD HH:mm:ss')}`)

	jQuery('#container').fadeIn();

	if (jQuery('.progress').length) {
		timer = setInterval(function() {
			const progress = updateProgress('.progress');
			if (progress == 100) refreshDisplay();
		}, 1000)
		updateProgress('.progress');
	}

	jQuery('.brand').click(function() {
		refreshDisplay()
	})

	jQuery('.datetime').click(function() {
		admin = true;
		updateOnScreenDateTime();
		setTimeout(function() {
			admin = false;
		}, 10000)
	})
})

function refreshDisplay() {
	jQuery('#container').fadeOut(function() {
		document.location = document.location;
	})
}

function updateOnScreenDateTime() {
	if (admin) {
		$('.date').text(`${jQuery('.ip').val()} [${jQuery('.slug').val()}]`)
		$('.time').text(`Next refresh in ${nextRefresh.diff(moment(), 'seconds')} seconds`)
	} else {
		$('.date').text(moment().format('dddd, Do MMMM YYYY'))
		$('.time').text(moment().format('HH:mm:ss'))
	}
}

function updateProgress(element) {
	const progress = calculateProgress(element);
	$(element).children('.bar').width(`${progress}%`);
	return progress;
}

function calculateProgress(element) {
	var start = moment($(element).data('start'));
	var end = moment($(element).data('end'));
	var progress = (1 - (end.diff(moment(), 'milliseconds') / end.diff(start, 'milliseconds'))) * 100;
	if (progress > 100) progress = 100;
	if (progress < 0) progress = 0;
	return progress;
}

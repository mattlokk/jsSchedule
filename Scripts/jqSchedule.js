var ItemSelected;

function Schedule() {
    var Schedule, StartDate, EndDate, ScheduleItems, NumDays, EarliestItem, EventSave;

    var Create = function (container, startDate, endDate, scheduleItems, eventSave) {
        Schedule = $('<div>');
        Schedule.addClass('scheduleContainer')
        StartDate = startDate;
        EndDate = endDate;
        ScheduleItems = scheduleItems;
        EventSave = eventSave;
        NumDays = EndDate.diff(StartDate, 'days') + 1;
        EarliestItem = 9;
        addHeader();
        addBody();
        addScheduleItems();
        addFooter();
        container.append(Schedule);
        container.addClass('jsSchedule');

        setTimeout(function () {
            $("#divSchedule .scheduleContainer .scheduleBody").scrollTop(EarliestItem * 50);
        }, 50);
    };

    function addHeader() {
        var header = $('<tr>');
        var timeZoneCell = $('<th>');
        timeZoneCell.addClass('timeZoneCell');
        timeZoneCell.append('<span>GMT -8</span>');
        header.append(timeZoneCell);
        for (var i = 0; i < NumDays; i++) {
            var currentDay = (i == 0) ? new moment(StartDate) : currentDay.add(1, 'd');
            var cell = $('<th>');
            cell.append('<span>' + currentDay.format('MM/DD/YY') + '</span>');
            cell.addClass('headerCell');
            header.append(cell);
        }
        var table = $('<table>');
        table.addClass('scheduleHeader');
        table.append($('<thead>')).append(header);
        var div = $('<div>');
        div.addClass('scheduleHeader');
        div.append(table);
        Schedule.append(div);
    }

    function addBody() {
        var row = $('<tr>');

        var timeCol = $('<td>');
        timeCol.addClass('timeColumn');
        for (var i = 0; i < 24; i++) {
            var cell = $('<div>');
            var timeString = (i == 0) ? '12am' : ((i > 12) ? (i - 12) + 'pm' : i + 'am');
            cell.append('<span>' + timeString + '</span>');
            timeCol.append(cell);
        }
        row.append(timeCol);

        for (var i = 0; i < NumDays; i++) {
            var dayCol = $('<td>');
            dayCol.addClass('timeCellContainer');
            var colDiv = $('<div>');
            for (var j = 0; j < 48; j++) {
                var timeCell = $('<div>');
                timeCell.addClass('timeCell');
                timeCell.attr('day', i);
                timeCell.attr('time', j);
                timeCell.addClass((j % 2 == 0) ? 'Even' : 'Odd');
                timeCell.click(newJob);
                colDiv.append(timeCell);
            }
            dayCol.append(colDiv);
            row.append(dayCol);
        }

        var div = $('<div>');
        div.addClass('scheduleBody');
        var table = $('<table>');
        var tbody = $('<tbody>');
        tbody.append(row);
        table.append(tbody);
        div.append(table);
        Schedule.append(div);
    }

    function addScheduleItems() {
        $('.scheduleBody table tbody tr td div .event').remove();
        $('.scheduleBody table tbody tr td div .conflictedEvent').remove();
        $('.scheduleBody table tbody tr td div .doubleConflictedEvent').remove();

        function custom_sort(a, b) {
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        }
        ScheduleItems.items.sort(custom_sort);

        var previousConflict = false;
        var lastEndTime = new moment('0');
        for (var i = 0; i < ScheduleItems.items.length; i++) {
            var si = ScheduleItems.items[i];
            var start = new moment(si.startTime);
            var conflict = (start < lastEndTime) ? true : false;
            var endTime = moment(si.startTime).add(si.duration, 'hours');
            if (endTime > lastEndTime) lastEndTime = endTime;
            var startHour = start.hours();
            if (start.minutes() > 0) {
                startHour += (start.minutes() / 60);
            }
            if (startHour < EarliestItem)
                EarliestItem = startHour;

            var top = ((startHour * 50) + 4);
            var event = $('<div>');
            event.append('<input type="hidden" class="index" value="' + i + '"></input>');
            event.addClass((conflict) ? ((previousConflict) ? 'doubleConflictedEvent' : 'conflictedEvent') : 'event');
            event.addClass('blue');
            event.css('top', (top + 'px'));
            event.css('height', ((si.duration * 50) - 10) + 'px');

            var routeColor;
            for (var j = 0; j < ScheduleItems.routes.length; j++){
                if (ScheduleItems.routes[j].routeID == si.routeID) routeColor = ScheduleItems.routes[j].color;            
            }
            event.css('background-color', '#' + routeColor)
            event.zIndex(top);
            event.css('position', 'absolute');
            event.append('<div style="width: 100%; height: 100%;">' + si.title + '<br />' + si.description + '</div>');
            event.mousedown(selectItem);
            event.mouseup({
                si: si
            }, setSelectedItem);
            event.resizable({
                handles: "s",
                resize: function (event, ui) {
                    ItemSelected = false;
                },
                stop: eventResized
            });
            event.draggable({
                drag: function (event, ui) {
                    ItemSelected = false;
                    $(event.target).css('opacity', '0.6');
                },
                stop: eventDragged
            });

            var startDay = start.diff(StartDate, 'days');
            var dayCol = $(Schedule.find('.scheduleBody table tbody tr td')[startDay + 1]);
            $(dayCol.find('div')[0]).append(event);
            previousConflict = conflict;
        }

        function eventResized(event, ui) {
            var cellHeight = 25;
            var diff = (ui.size.height - ui.originalSize.height) + (cellHeight / 2);
            var si = ScheduleItems.items[event.target.childNodes[0].value];
            var hrsChange = (Math.floor(diff / cellHeight)) / 2;
            if (Math.abs(hrsChange) > 0)
                si.duration += hrsChange;
            EventSave(si);
            addScheduleItems();
        }

        function eventDragged(event, ui) {
            var cellWidth = ($(Schedule.find('.scheduleBody table tbody tr td')[1]).width() + 4);
            var cellHeight = 25;
            var xDiff = Math.abs((ui.position.left - ui.originalPosition.left));
            var xDir = (ui.position.left > ui.originalPosition.left);
            xDiff += ((xDir) ? 1 : -1) * ((xDiff % cellWidth) > (cellWidth / 2)) ? (cellWidth - (xDiff % cellWidth)) : (xDiff % cellWidth) * -1;
            var xMove = (xDir) ? xDiff : (xDiff * -1);
            var yDiff = (ui.position.top - ui.originalPosition.top);
            var daysDiff = (Math.floor(xMove / cellWidth));
            var hoursDiff = ((Math.floor(yDiff / cellHeight)) / 2);
              var si = ScheduleItems.items[event.target.childNodes[0].value];
            if (Math.abs(daysDiff) > 0) si.startTime = new moment(si.startTime).add(daysDiff, 'days');
            if (Math.abs(hoursDiff) > 0) si.startTime = new moment(si.startTime).add(hoursDiff, 'hours');
            EventSave(si);
            addScheduleItems();
        }
    }

    function addFooter() {
        var footer = $('<div>').addClass('scheduleFooter');
        var btnShowJson = $('<input type="button">');
        btnShowJson.val('Show JSON');
        btnShowJson.click(function () {
            alert(JSON.stringify(ScheduleItems));
        });
        footer.append(btnShowJson);
        var btnReset = $('<input type="button">');
        btnReset.val('RESET');
        btnReset.click(function () {
            addScheduleItems();
        });
        footer.append(btnReset);

        for (var i = 0; i < ScheduleItems.routes.length; i++){
            var route = ScheduleItems.routes[i];
            var div = $('<div>');
            div.text(route.name);
            div.addClass('routeLegend');
            div.css('background-color', '#' + route.color);
            footer.append(div);
        }
        Schedule.append(footer);
    }

    return {
        create: Create
    };
}

function selectItem() {
    ItemSelected = true;
}

function setSelectedItem(event) {
    //if (ItemSelected) alert(event.data.si.title);
}
function newJob(event) {
    //alert('hey');
}
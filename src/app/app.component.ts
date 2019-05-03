import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
const DebugOnTestData = false;

interface DayRates {
  date: Date;
  USD: number; EUR: number; GBP: number;
}
// для тестирования
const getRate = arr => arr[Math.round(Math.random() * (arr.length - 1))];
const getData = (i: number): DayRates => {
  return {
    date: new Date(Date.now() - 86400000 * i),
    USD: getRate([26.5, 26.6, 26.7, 26.8, 26.9, 27.0, 27.1, 27.2, 27.3, 26.5, 26.5, 26.5, 26.5, 26.5, 26.5]),
    EUR: getRate([30.0, 30.1, 30.2, 30.3, 30.4, 30.5, 30.6, 30.0, 30.0, 30.0, 31.0, 30.0, 30.0, 32.0, 30.0]),
    GBP: getRate([20.0, 20.1, 20.2, 20.2, 20.4, 20.5, 20.6, 20.0, 20.0, 20.0, 21.0, 20.0, 20.0, 22.0, 20.0])
  };
};
//
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  date1: any = new Date();
  date2: any = new Date();
  dataSource: MatTableDataSource<DayRates>;
  displayedColumns: string[] = ['date', 'USD', 'EUR', 'GBP'];
  errorMes = '';
  items = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private http: HttpClient) {
    this.date1.setHours(0, 0, 0, 0);
    this.date2.setHours(0, 0, 0, 0);
  }

  getMomentTime(t) {
      return (t._d || t).getTime();
  }

  checkRange(e) {
    if (!this.date1 || !this.date2) {
        return;
    }
    const fourDaysMs = 3600 * 24 * 1000 * 4;
    const d1 = this.getMomentTime(this.date1);
    const d2 = this.getMomentTime(this.date2);
    const dif = d2 - d1;
    if (dif < fourDaysMs && dif > 0 ) {
      return;
    } else if (e === 1) {
      this.date2 = new Date(d1 + fourDaysMs);
    } else if (e === 2) {
      this.date1 = new Date(d2 - fourDaysMs);
    }
  }

  run() {
    this.errorMes = '';
    let start = this.getMomentTime(this.date1);
    const end = this.getMomentTime(this.date2);
    for (const day = 86400000; start <= end; start += day) {
      if (this.items.findIndex(e => start === e.date.getTime()) === -1) {
        this.getDayRates(new Date(start));
      }
    }
  }

  getDayRates(date: Date) {
    let day = date.getFullYear() +
      [date.getMonth() + 1, date.getDate()].map(e => (e < 10 && '0') + e).join('');
    const req = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?date=${day}&json`;
      //'http://localhost:3500/' + day;
    this.http.get(req)
      .pipe(map(result => (result as any)))
      .subscribe(result => {
        const [USD, EUR, GBP] = ['USD', 'EUR', 'GBP'].map(name => {
          const i = result.findIndex(e => e.cc === name);
          if (i === -1) {
            day = date.toISOString().slice(0, 10);
            this.errorMes += `${this.errorMes ? ',' : ' Нет данных за:'} ${day}`;
            throw new Error('Data is absent for ' + day);
          }
          return result[i].rate;
        });
        this.items.push({date, USD, EUR, GBP});
        this.dataSource = new MatTableDataSource(this.items);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      }, error => {
        console.error(error);
        if (error.status === 404) {
          this.errorMes = ' Ошибка: Сервер не отвечает.';
        } else if (error.status === 0 && this.errorMes === '') {
          this.errorMes = ' Кажется отключился Интернет.';
        }
    });
}

  ngOnInit() {
     if (DebugOnTestData) {
       this.dataSource = new MatTableDataSource(Array.from({ length: 100 }, (_, k) => getData(k + 1)));
       this.dataSource.paginator = this.paginator;
       this.dataSource.sort = this.sort;
     } else {
       this.run();
     }
  }

  applyFilter(filterValue: string) {
    const ds = this.dataSource;
    ds.filter = filterValue.trim().toLowerCase();
    if (ds.paginator) {
        ds.paginator.firstPage();
    }
  }
}

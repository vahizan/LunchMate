import { ScraperService } from '../scraper';
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { join } from 'path';



  describe('extractCrowdLevelData',  () => {
    test('should call api to fetch scraped result', async () => {
      const scraper = new ScraperService();
      const result = await scraper.extractCrowdLevelData("restaurantName");
      expect(result).toEqual({});
    });
  });

  describe('extractCrowdDataFromPage',  () => {
    test('get crowd data from example html', async () => {
      const html = readFileSync(join(__dirname, './../../../example_scrape_data.html'), 'utf-8');
      const exampleHTML = new JSDOM(html);
      const scraper = new ScraperService();
      const result = await scraper.extractCrowdDataFromPage(exampleHTML);
      expect(result).toEqual({
        "averageTimeSpent": "People typically spend up to 3 hours here",
        "crowdLevel": "busy",
        "restaurantName": undefined,
        "lastUpdated": expect.any(Date),
         "source": "google",
      });
    });
  });
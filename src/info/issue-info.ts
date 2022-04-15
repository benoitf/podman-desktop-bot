import { injectable } from 'inversify';

export class IssueInfo {
  private __repository: string;
  private __owner: string;
  private __number: number;
  private __labels: string[];
  private __htmlLink: string;
  private __author: string;
  private __body: string;

  public withBody(body: string): this {
    this.__body = body;
    return this;
  }

  public withAuthor(author: string): this {
    this.__author = author;
    return this;
  }

  public withHtmlLink(htmlLink: string): this {
    this.__htmlLink = htmlLink;
    return this;
  }

  public withRepo(repository: string): this {
    this.__repository = repository;
    return this;
  }

  public withLabels(labels: string[]): this {
    this.__labels = labels;
    return this;
  }

  public withOwner(owner: string): this {
    this.__owner = owner;
    return this;
  }

  public withNumber(number: number): this {
    this.__number = number;
    return this;
  }

  public get body(): string {
    return this.__body;
  }

  public get author(): string {
    return this.__author;
  }

  public get repo(): string {
    return this.__repository;
  }

  public get owner(): string {
    return this.__owner;
  }

  public get number(): number {
    return this.__number;
  }

  public get labels(): string[] {
    return this.__labels;
  }

  public get htmlLink(): string {
    return this.__htmlLink;
  }

  public hasLabel(labelName: string): boolean {
    return this.__labels.includes(labelName);
  }
}

@injectable()
export class IssueInfoBuilder {
  build(): IssueInfo {
    return new IssueInfo();
  }
}
